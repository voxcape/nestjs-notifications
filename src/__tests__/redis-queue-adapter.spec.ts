import { Logger } from '@nestjs/common';
import { RedisQueueAdapter } from '../adapters/redis-queue.adapter';

const lpushMock = jest.fn();
const brpopMock = jest.fn();
const quitMock = jest.fn();
const disconnectMock = jest.fn();

let lastRedisConfig: { host: string; port: number } | undefined;

jest.mock('ioredis', () => ({
    Redis: jest.fn().mockImplementation((config: { host: string; port: number }) => {
        lastRedisConfig = config;
        return {
            lpush: lpushMock,
            brpop: brpopMock,
            quit: quitMock,
            disconnect: disconnectMock,
        };
    }),
}));

const { Redis: redisConstructorMock } = jest.requireMock('ioredis') as { Redis: jest.Mock };

const adapters: RedisQueueAdapter[] = [];

const originalEnvSnapshot: Record<string, string | undefined> = {};

function deleteEnv(keys: string[]): void {
    keys.forEach((key) => delete process.env[key]);
}

function createAdapter(serializer?: any): RedisQueueAdapter {
    const adapter = new RedisQueueAdapter(serializer);
    adapters.push(adapter);
    return adapter;
}

const loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

beforeAll(() => {
    ['REDIS_QUEUE_KEY', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_QUEUE_BLOCK_TIMEOUT'].forEach((key) => {
        originalEnvSnapshot[key] = process.env[key];
    });
});

beforeEach(() => {
    jest.clearAllMocks();
    redisConstructorMock.mockClear();
    lpushMock.mockReset();
    brpopMock.mockReset();
    quitMock.mockReset();
    disconnectMock.mockReset();
    lpushMock.mockResolvedValue(1);
    brpopMock.mockResolvedValue(null);
    lastRedisConfig = undefined;
    deleteEnv(['REDIS_QUEUE_KEY', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_QUEUE_BLOCK_TIMEOUT']);
    loggerLogSpy.mockClear();
    loggerErrorSpy.mockClear();
});

afterEach(() => {
    adapters.forEach((adapter) => {
        const redisClient = (adapter as any).redis;
        redisClient.quit?.();
        redisClient.disconnect?.();
    });
    adapters.length = 0;
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

describe('RedisQueueAdapter', () => {
    it('creates redis client using environment configuration', () => {
        process.env.REDIS_HOST = '10.1.0.5';
        process.env.REDIS_PORT = '6385';
        process.env.REDIS_QUEUE_KEY = 'custom:queue';

        const adapter = createAdapter();

        expect(redisConstructorMock).toHaveBeenCalledWith({ host: '10.1.0.5', port: 6385 });
        expect(lastRedisConfig).toEqual({ host: '10.1.0.5', port: 6385 });
        expect((adapter as any).queueKey).toBe('custom:queue');
    });

    it('enqueues job and logs queue details', async () => {
        const serializer = {
            serialize: jest.fn((notification: any, recipient: any) => ({
                notification: notification?.constructor?.name,
                data: notification,
                recipient,
                timestamp: Date.now(),
            })),
        };
        const adapter = createAdapter(serializer);
        const notification = { constructor: { name: 'TestNotification' } } as unknown as any;
        const recipient = { id: 'user-1' };

        await adapter.enqueue(notification, recipient);

        expect(lpushMock).toHaveBeenCalledWith(
            'notifications:queue',
            expect.stringContaining('TestNotification'),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
            'Queued notification: TestNotification => user-1',
        );
        expect(serializer.serialize).toHaveBeenCalledWith(notification, recipient);
    });

    it('throws when enqueue is called without serializer', async () => {
        const adapter = createAdapter();
        const notification = { constructor: { name: 'TestNotification' } } as unknown as any;
        const recipient = { id: 'user-1' };

        await expect(adapter.enqueue(notification, recipient)).rejects.toThrow(
            'RedisQueueAdapter requires NotificationSerializer to enqueue.',
        );
        expect(lpushMock).not.toHaveBeenCalled();
    });

    it('dequeues job using provided timeout configuration', async () => {
        const jobPayload = { id: 'job-1' };
        brpopMock.mockResolvedValueOnce(['notifications:queue', JSON.stringify(jobPayload)]);
        const adapter = createAdapter();

        const job = await adapter.dequeue({ blockTimeoutSeconds: 1 });

        expect(brpopMock).toHaveBeenCalledWith('notifications:queue', 1);
        expect(job).toEqual(jobPayload);
    });

    it('returns null when queue is empty', async () => {
        const adapter = createAdapter();

        const job = await adapter.dequeue({ blockTimeoutSeconds: 2 });

        expect(job).toBeNull();
    });

    it('returns null and logs when payload cannot be parsed', async () => {
        brpopMock.mockResolvedValueOnce(['notifications:queue', 'not-json']);
        const adapter = createAdapter();

        const job = await adapter.dequeue();

        expect(job).toBeNull();
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to parse queued job:'),
        );
    });

    it('uses environment fallback for dequeue timeout', async () => {
        process.env.REDIS_QUEUE_BLOCK_TIMEOUT = '9';
        const adapter = createAdapter();

        await adapter.dequeue();

        expect(brpopMock).toHaveBeenCalledWith('notifications:queue', 9);
    });

    it('processes jobs in work loop and executes lifecycle hooks', async () => {
        const jobPayload = { id: 'job-2' };
        brpopMock.mockResolvedValueOnce(null);
        brpopMock.mockResolvedValueOnce(['notifications:queue', JSON.stringify(jobPayload)]);
        const adapter = createAdapter();

        const controller = new AbortController();
        const processJob = jest.fn().mockResolvedValue(undefined);
        const onStart = jest.fn();
        const onComplete = jest.fn().mockImplementation(() => controller.abort());

        await adapter.work(processJob, {
            stopSignal: controller.signal,
            blockTimeoutSeconds: 1,
            onStart,
            onComplete,
        });

        expect(onStart).toHaveBeenCalledWith(jobPayload);
        expect(processJob).toHaveBeenCalledWith(jobPayload);
        expect(onComplete).toHaveBeenCalledWith(jobPayload);
        expect(loggerLogSpy).toHaveBeenCalledWith('Worker started on queue: notifications:queue');
        expect(brpopMock).toHaveBeenCalledWith('notifications:queue', 1);
    });

    it('captures job failures and forwards to error handler', async () => {
        const jobPayload = { id: 'job-3' };
        brpopMock.mockResolvedValueOnce(['notifications:queue', JSON.stringify(jobPayload)]);
        const adapter = createAdapter();

        const controller = new AbortController();
        const failure = new Error('failure');
        const processJob = jest.fn().mockRejectedValue(failure);
        const onError = jest.fn().mockImplementation(() => controller.abort());

        await adapter.work(processJob, {
            stopSignal: controller.signal,
            onError,
        });

        expect(onError).toHaveBeenCalledWith(failure, jobPayload);
        expect(loggerErrorSpy).toHaveBeenCalledWith('Job failed: failure');
    });
});
