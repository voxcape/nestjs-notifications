import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BroadcastAdapter } from '../interfaces/broadcast-adapter.interface';

@Injectable()
export class RedisBroadcastAdapter implements BroadcastAdapter {
    private readonly logger = new Logger(RedisBroadcastAdapter.name);
    private publisher: Redis;

    private readonly redisHost = process.env.REDIS_HOST || '127.0.0.1';
    private readonly redisPort = Number(process.env.REDIS_PORT || 6379);
    private readonly redisPrefix = process.env.REDIS_CHANNEL_PREFIX || 'notifications';

    constructor() {
        this.publisher = new Redis({
            host: this.redisHost,
            port: this.redisPort,
        });
    }

    /**
     * @inheritDoc
     */
    async publish(channel: string, payload: any): Promise<void> {
        const topic = `${this.redisPrefix}.${channel}`;
        try {
            await this.publisher.publish(topic, JSON.stringify(payload));
            this.logger.log(`Published to Redis channel: ${topic}`);
        } catch (err) {
            this.logger.error(`Redis publish failed: ${(err as Error).message}`);
        }
    }
}
