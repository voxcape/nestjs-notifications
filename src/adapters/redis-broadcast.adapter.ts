import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BroadcastAdapter } from '../interfaces/broadcast-adapter.interface';

@Injectable()
export class RedisBroadcastAdapter implements BroadcastAdapter {
    private readonly logger = new Logger(RedisBroadcastAdapter.name);
    private publisher: Redis | null = null;

    private readonly redisHost = process.env.REDIS_HOST || '127.0.0.1';
    private readonly redisPort = Number(process.env.REDIS_PORT || 6379);
    private readonly redisPrefix = process.env.REDIS_CHANNEL_PREFIX || 'notifications';

    private ensureConnection(): void {
        if (this.publisher) {
            return;
        }

        try {
            this.publisher = new Redis({
                host: this.redisHost,
                port: this.redisPort,
                lazyConnect: true,
                maxRetriesPerRequest: 1,
            });

            this.logger.log(
                `Redis broadcast adapter initialized (${this.redisHost}:${this.redisPort})`,
            );
        } catch (error) {
            this.logger.warn(
                `Failed to initialize Redis connection: ${(error as Error).message}. Broadcast features will be disabled.`,
            );
            this.publisher = null;
        }
    }

    /**
     * @inheritDoc
     */
    async publish(channel: string, payload: any): Promise<void> {
        this.ensureConnection();

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
