import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BroadcastAdapter } from '../interfaces/broadcast-adapter.interface';
import { NOTIFICATION_MODULE_OPTIONS } from '../constants';
import type { NotificationModuleOptions } from '../types';

@Injectable()
export class RedisBroadcastAdapter implements BroadcastAdapter {
    private readonly logger = new Logger(RedisBroadcastAdapter.name);
    private publisher: Redis | null = null;

    private readonly redisHost = process.env.REDIS_HOST || '127.0.0.1';
    private readonly redisPort = Number(process.env.REDIS_PORT || 6379);
    private readonly redisPrefix = process.env.REDIS_CHANNEL_PREFIX || 'notifications';
    private workerEnabled = false;

    constructor(
        @Optional()
        @Inject(NOTIFICATION_MODULE_OPTIONS)
        private readonly moduleOptions?: NotificationModuleOptions,
    ) {
        this.workerEnabled = this.moduleOptions?.worker?.enabled ?? false;
        this.publisher = this.workerEnabled
            ? new Redis({
                  host: this.redisHost,
                  port: this.redisPort,
                  lazyConnect: true,
                  maxRetriesPerRequest: 1,
              })
            : null;
    }

    /**
     * @inheritDoc
     */
    async publish(channel: string, payload: any): Promise<void> {
        if (!this.publisher) {
            this.logger.warn('Redis not available. Skipping broadcast operation.');
            return;
        }

        const topic = `${this.redisPrefix}.${channel}`;
        try {
            await this.publisher.publish(topic, JSON.stringify(payload));
            this.logger.log(`Published to Redis channel: ${topic}`);
        } catch (err) {
            this.logger.error(`Redis publish failed: ${(err as Error).message}`);
        }
    }
}
