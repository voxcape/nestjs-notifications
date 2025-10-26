import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    QueueAdapter,
    QueueDequeueConfig,
    QueueWorkerConfig,
} from '../interfaces/queue-adapter.interface';
import { Notification } from '../notification.interface';
import { RecipientLike } from '../types';
import { Redis } from 'ioredis';
import { env } from '../utils/env';
import { NotificationSerializer } from '../notification.serializer';

@Injectable()
export class RedisQueueAdapter implements QueueAdapter {
    private readonly logger = new Logger(RedisQueueAdapter.name);
    private redis: Redis;
    private readonly queueKey = env('REDIS_QUEUE_KEY', 'notifications:queue');

    constructor(@Optional() private readonly serializer?: NotificationSerializer) {
        const host = env('REDIS_HOST', '127.0.0.1');
        const port = Number(env('REDIS_PORT', 6379));

        this.redis = new Redis({
            host,
            port,
        });
    }

    /**
     * @inheritDoc
     */
    async enqueue(notification: Notification, recipient: RecipientLike): Promise<void> {
        if (!this.serializer) {
            throw new Error('RedisQueueAdapter requires NotificationSerializer to enqueue.');
        }

        const payload = this.serializer.serialize(notification, recipient);

        await this.redis.lpush(this.queueKey, JSON.stringify(payload));
        this.logger.log(
            `Queued notification: ${payload.notification} => ${recipient.email ?? recipient.id}`,
        );
    }

    /**
     * @inheritDoc
     */
    async dequeue(config: QueueDequeueConfig = {}): Promise<any | null> {
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
}
