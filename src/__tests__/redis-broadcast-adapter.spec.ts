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
const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
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
    loggerWarnSpy.mockClear();
    loggerErrorSpy.mockClear();
    resetEnv();
});

afterAll(() => {
    loggerLogSpy.mockRestore();
    loggerWarnSpy.mockRestore();
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
    it('creates Redis client when worker enabled', () => {
        process.env.REDIS_HOST = '10.0.0.5';
        process.env.REDIS_PORT = '6380';
        process.env.REDIS_CHANNEL_PREFIX = 'custom.notifications';

        const adapter = new RedisBroadcastAdapter({ worker: { enabled: true } });

        expect(RedisMock).toHaveBeenCalledWith({
            host: '10.0.0.5',
            port: 6380,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        });
        expect((adapter as any).redisPrefix).toBe('custom.notifications');
    });

    it('does not create Redis client when worker disabled', () => {
        process.env.REDIS_HOST = '10.0.0.5';
        process.env.REDIS_PORT = '6380';

        const adapter = new RedisBroadcastAdapter({ worker: { enabled: false } });

        expect(RedisMock).not.toHaveBeenCalled();
        expect((adapter as any).publisher).toBeNull();
    });

    it('does not create Redis client when no module options provided', () => {
        const adapter = new RedisBroadcastAdapter();

        expect(RedisMock).not.toHaveBeenCalled();
        expect((adapter as any).publisher).toBeNull();
    });

    it('publishes payload to prefixed channel and logs success', async () => {
        const adapter = new RedisBroadcastAdapter({ worker: { enabled: true } });
        const payload = { message: 'Hello world' };

        await adapter.publish('updates', payload);

        expect(publishMock).toHaveBeenCalledWith('notifications.updates', JSON.stringify(payload));
        expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Published to Redis channel: notifications.updates'),
        );
    });

    it('skips publish when worker disabled', async () => {
        const adapter = new RedisBroadcastAdapter({ worker: { enabled: false } });
        const payload = { message: 'Hello world' };

        await adapter.publish('updates', payload);

        expect(publishMock).not.toHaveBeenCalled();
        expect(loggerWarnSpy).toHaveBeenCalledWith(
            'Redis not available. Skipping broadcast operation.',
        );
    });

    it('logs error when Redis publish throws', async () => {
        const adapter = new RedisBroadcastAdapter({ worker: { enabled: true } });
        const failure = new Error('Connection lost');
        publishMock.mockRejectedValueOnce(failure);

        await adapter.publish('alerts', { message: 'Important' });

        expect(loggerErrorSpy).toHaveBeenCalledWith('Redis publish failed: Connection lost');
    });
});
