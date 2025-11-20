import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import {
    EnqueueOptions,
    QueueAdapter,
    QueueDequeueConfig,
    QueueWorkerConfig,
} from '../interfaces/queue-adapter.interface';
import { RecipientLike } from '../types';
import { Redis } from 'ioredis';
import { env } from '../utils/env';
import { NotificationSerializer } from '../notification.serializer';
import { BaseNotification } from '../base-notification';
import { NOTIFICATION_MODULE_OPTIONS } from '../constants';
import type { NotificationModuleOptions } from '../types';

@Injectable()
export class RedisQueueAdapter implements QueueAdapter {
    private readonly logger = new Logger(RedisQueueAdapter.name);
    private redis: Redis | null = null;
    private readonly queueKey = env('REDIS_QUEUE_KEY', 'notifications:queue');
    private readonly host = env('REDIS_HOST', '127.0.0.1');
    private readonly port = Number(env('REDIS_PORT', 6379));
    private workerEnabled = false;

    constructor(
        @Optional() private readonly serializer?: NotificationSerializer,
        @Optional()
        @Inject(NOTIFICATION_MODULE_OPTIONS)
        private readonly moduleOptions?: NotificationModuleOptions,
    ) {
        this.workerEnabled = this.moduleOptions?.worker?.enabled ?? false;
        this.redis = this.workerEnabled
            ? new Redis({
                  host: this.host,
                  port: this.port,
              })
            : null;
    }

    /**
     * @inheritDoc
     */
    async enqueue(
        notification: BaseNotification,
        recipient: RecipientLike,
        options: EnqueueOptions = {},
    ): Promise<void> {
        if (!this.redis) {
            this.logger.warn('Redis not available. Skipping queue operation.');
            return;
        }

        if (!this.serializer) {
            throw new Error('RedisQueueAdapter requires NotificationSerializer to enqueue.');
        }

        const payload = this.serializer.serialize(notification, recipient);
        const envelope = { ...payload, attempt: options?.attempt ?? 0 };

        const delaySeconds = options?.delaySeconds ?? payload.data.delaySeconds;

        if (delaySeconds && delaySeconds > 0) {
            const score = Date.now() + delaySeconds * 1000;
            await this.redis.zadd(this.getDelayedKey(), score, JSON.stringify(envelope));
            this.logger.log(`Queued notification delayed till ${score}`);
        } else {
            await this.redis.lpush(this.queueKey, JSON.stringify(payload));
        }

        this.logger.log(
            `Queued notification: ${payload.notification} => ${recipient.email ?? recipient.id}`,
        );
    }

    /**
     * @inheritDoc
     */
    async dequeue(config: QueueDequeueConfig = {}): Promise<any | null> {
        if (!this.redis) {
            return null;
        }

        const blockTimeout =
            config.blockTimeoutSeconds ?? Number(env('REDIS_QUEUE_BLOCK_TIMEOUT', 5));
        const result = await this.redis.brpop(this.queueKey, blockTimeout);

        if (!result) return null;

        const [, raw] = result;
        try {
            return JSON.parse(raw);
        } catch (err) {
            this.logger.error(`Failed to parse queued job: ${(err as Error).message}`);
            return null;
        }
    }

    /**
     * @inheritDoc
     */
    async work(
        processJob: (job: any) => Promise<void>,
        config: QueueWorkerConfig = {},
    ): Promise<void> {
        if (!this.redis) {
            this.logger.error('Redis not available. Cannot start worker.');
            throw new Error(
                'Redis connection required for worker. Please configure Redis or disable the worker.',
            );
        }

        const signal = config.stopSignal;
        let running = true;

        if (signal) {
            signal.addEventListener('abort', () => {
                this.logger.log('Worker stop signal received.');
                running = false;
            });
        }

        this.logger.log(`Worker started on queue: ${this.queueKey}`);

        while (running) {
            try {
                await this.promoteDueDelayedJobs();
            } catch (e) {
                this.logger.error(`Failed promoting delayed jobs: ${(e as Error).message}`);
            }

            const job = await this.dequeue(config);
            if (!job) continue;

            try {
                config.onStart?.(job);
                await processJob(job);
                config.onComplete?.(job);
            } catch (err) {
                this.logger.error(`Job failed: ${(err as Error).message}`);
                config.onError?.(err as Error, job);
            }
        }
    }

    /**
     * Promotes delayed jobs to the main queue.
     *
     * @param batchSize
     * @return Number of jobs promoted
     */
    private async promoteDueDelayedJobs(batchSize: number = 100): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        const delayedKey = this.getDelayedKey();
        const now = Date.now();

        const due = await this.redis.zrangebyscore(delayedKey, 0, now, 'LIMIT', 0, batchSize);
        if (!due.length) return 0;

        const multi = this.redis.multi();

        for (const item of due) {
            multi.zrem(delayedKey, item);
            multi.lpush(this.queueKey, item);
        }
        await multi.exec();
        return due.length;
    }

    private getDelayedKey(): string {
        return `${this.queueKey}:delayed`;
    }
}
