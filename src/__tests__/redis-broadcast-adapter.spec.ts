import { Logger } from '@nestjs/common';
import { RedisBroadcastAdapter } from '../adapters/redis-broadcast.adapter';

jest.mock('ioredis', () => {
    const publishMock = jest.fn();
    const RedisMock = jest.fn().mockImplementation(() => ({
        publish: publishMock,
    }));

    return {
        __esModule: true,
        Redis: RedisMock,
        default: RedisMock,
        __mocked: {
            publishMock,
            RedisMock,
        },
    };
});

const ioredisMock = jest.requireMock('ioredis') as {
    Redis: jest.Mock;
    __mocked: {
        publishMock: jest.Mock;
        RedisMock: jest.Mock;
    };
};

const RedisMock = ioredisMock.Redis;
const publishMock = ioredisMock.__mocked.publishMock;

const loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

const envKeys = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_CHANNEL_PREFIX'];
const originalEnvSnapshot: Record<string, string | undefined> = {};

envKeys.forEach((key) => {
    originalEnvSnapshot[key] = process.env[key];
});

function resetEnv(): void {
    envKeys.forEach((key) => delete process.env[key]);
}

beforeEach(() => {
    jest.clearAllMocks();
    publishMock.mockReset();
    publishMock.mockResolvedValue(undefined);
    RedisMock.mockClear();
    loggerLogSpy.mockClear();
    loggerErrorSpy.mockClear();
    resetEnv();
});

afterAll(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    Object.entries(originalEnvSnapshot).forEach(([key, value]) => {
        if (value === undefined) {
            delete process.env[key];
            return;
        }
        process.env[key] = value;
    });
});

describe('RedisBroadcastAdapter', () => {
    describe('constructor', () => {
        it('constructs Redis client using environment config and prefix', () => {
            process.env.REDIS_HOST = '10.0.0.5';
            process.env.REDIS_PORT = '6380';
            process.env.REDIS_CHANNEL_PREFIX = 'custom.notifications';

            const adapter = new RedisBroadcastAdapter();

            expect(RedisMock).toHaveBeenCalledWith({ host: '10.0.0.5', port: 6380 });
            expect((adapter as any).redisPrefix).toBe('custom.notifications');
        });

        it('falls back to defaults when env vars are not set', () => {
            const adapter = new RedisBroadcastAdapter();

            expect(RedisMock).toHaveBeenCalledWith({ host: '127.0.0.1', port: 6379 });
            expect((adapter as any).redisPrefix).toBe('notifications');
        });

        it('parses REDIS_PORT as an integer', () => {
            process.env.REDIS_PORT = '6399';

            const adapter = new RedisBroadcastAdapter();

            expect(typeof (adapter as any).redisPort).toBe('number');
            expect(RedisMock).toHaveBeenCalledWith(expect.objectContaining({ port: 6399 }));
        });
    });

    describe('publish', () => {
        it('publishes payload to prefixed channel and logs success', async () => {
            const adapter = new RedisBroadcastAdapter();
            const payload = { message: 'Hello world' };

            await adapter.publish('updates', payload);

            expect(publishMock).toHaveBeenCalledWith(
                'notifications.updates',
                JSON.stringify(payload),
            );
            expect(loggerLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Published to Redis channel: notifications.updates'),
            );
        });

        it('publishes to multiple channels using the correct prefixed topics', async () => {
            const adapter = new RedisBroadcastAdapter();

            await adapter.publish('orders', { status: 'created' });
            await adapter.publish('users', { action: 'login' });

            expect(publishMock).toHaveBeenNthCalledWith(
                1,
                'notifications.orders',
                JSON.stringify({ status: 'created' }),
            );
            expect(publishMock).toHaveBeenNthCalledWith(
                2,
                'notifications.users',
                JSON.stringify({ action: 'login' }),
            );
        });

        it('serializes array payloads correctly', async () => {
            const adapter = new RedisBroadcastAdapter();
            const payload = [1, 'two', { three: true }];

            await adapter.publish('events', payload);

            expect(publishMock).toHaveBeenCalledWith(
                'notifications.events',
                JSON.stringify(payload),
            );
        });

        it('uses custom prefix in topic when REDIS_CHANNEL_PREFIX is set', async () => {
            process.env.REDIS_CHANNEL_PREFIX = 'myapp';
            const adapter = new RedisBroadcastAdapter();

            await adapter.publish('alerts', { level: 'high' });

            expect(publishMock).toHaveBeenCalledWith(
                'myapp.alerts',
                JSON.stringify({ level: 'high' }),
            );
        });

        it('logs error when Redis publish throws', async () => {
            const adapter = new RedisBroadcastAdapter();
            const failure = new Error('Connection lost');
            publishMock.mockRejectedValueOnce(failure);

            await adapter.publish('alerts', { message: 'Important' });

            expect(loggerErrorSpy).toHaveBeenCalledWith('Redis publish failed: Connection lost');
        });

        it('does not re-throw when Redis publish fails', async () => {
            const adapter = new RedisBroadcastAdapter();
            publishMock.mockRejectedValueOnce(new Error('Timeout'));

            await expect(adapter.publish('test', { x: 1 })).resolves.toBeUndefined();
        });
    });
});
