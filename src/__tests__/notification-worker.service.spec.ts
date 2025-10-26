import { Logger } from '@nestjs/common';
import { NotificationWorkerService } from '../notification-worker.service';
import { QueueAdapter, QueueWorkerConfig } from '../interfaces/queue-adapter.interface';
import { NotificationManager } from '../notification.manager';
import { NotificationSerializer } from '../notification.serializer';

const createQueueAdapter = () => ({
    enqueue: jest.fn(),
    work: jest.fn(),
});

describe('NotificationWorkerService', () => {
    let queueAdapter: ReturnType<typeof createQueueAdapter>;
    let notifications: { send: jest.Mock };
    let serializer: { hydrate: jest.Mock };
    let service: NotificationWorkerService;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;
    let processOnSpy: jest.SpyInstance;
    let processRemoveSpy: jest.SpyInstance;
    let sigintHandler: ((signal?: NodeJS.Signals) => void) | undefined;
    let sigtermHandler: ((signal?: NodeJS.Signals) => void) | undefined;

    beforeEach(() => {
        queueAdapter = createQueueAdapter();
        notifications = {
            send: jest.fn(),
        };
        serializer = {
            hydrate: jest.fn().mockImplementation((_type: string, data: any) => data),
        };
        service = new NotificationWorkerService(
            queueAdapter as unknown as QueueAdapter,
            notifications as unknown as NotificationManager,
            serializer as unknown as NotificationSerializer,
        );

        loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        sigintHandler = undefined;
        sigtermHandler = undefined;
        processOnSpy = jest
            .spyOn(process, 'on')
            .mockImplementation((event: string | symbol, handler: any) => {
                if (event === 'SIGINT') {
                    sigintHandler = handler;
                }
                if (event === 'SIGTERM') {
                    sigtermHandler = handler;
                }
                return process;
            });
        processRemoveSpy = jest
            .spyOn(process, 'removeListener')
            .mockImplementation((_event: string | symbol, _handler: any) => process);
    });

    afterEach(() => {
        loggerLogSpy.mockRestore();
        loggerErrorSpy.mockRestore();
        processOnSpy.mockRestore();
        processRemoveSpy.mockRestore();
        delete process.env.QUEUE_BLOCK_TIMEOUT;
    });

    it('runs the worker with the provided block timeout and processes jobs successfully', async () => {
        const job = {
            notification: 'JobName',
            data: { foo: 'bar' },
            recipient: { email: 'user@example.com' },
        };
        const hydrated = { foo: 'bar', hydrated: true };
        serializer.hydrate.mockReturnValueOnce(hydrated);
        notifications.send.mockResolvedValue(undefined);

        let receivedConfig: QueueWorkerConfig | undefined;
        queueAdapter.work.mockImplementation(
            async (handler: (job: any) => Promise<void>, config) => {
                receivedConfig = config;
                expect(config?.blockTimeoutSeconds).toBe(10);
                expect(config?.stopSignal).toBeInstanceOf(AbortSignal);
                await handler(job);
                sigintHandler?.('SIGINT');
                expect(config?.stopSignal?.aborted).toBe(true);
            },
        );

        await service.start(10);

        expect(queueAdapter.work).toHaveBeenCalledTimes(1);
        expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
        expect(processRemoveSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        expect(processRemoveSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
        expect(loggerLogSpy).toHaveBeenCalledWith('Notification worker started');
        expect(loggerLogSpy).toHaveBeenCalledWith('Worker stopped gracefully.');
        expect(receivedConfig?.blockTimeoutSeconds).toBe(10);
        expect(receivedConfig?.stopSignal).toBeDefined();
        expect(serializer.hydrate).toHaveBeenCalledWith('JobName', job.data);
        expect(notifications.send).toHaveBeenCalledWith(hydrated, job.recipient, true);
        expect(sigintHandler).toBeDefined();
        expect(sigtermHandler).toBeDefined();
    });

    it('uses environment fallback when block timeout is not provided', async () => {
        process.env.QUEUE_BLOCK_TIMEOUT = '7';
        queueAdapter.work.mockResolvedValue(undefined);

        await service.start();

        const config = queueAdapter.work.mock.calls[0][1] as QueueWorkerConfig;
        expect(config.blockTimeoutSeconds).toBe(7);
        expect(config.stopSignal).toBeInstanceOf(AbortSignal);
    });

    it('logs errors when processing a job fails', async () => {
        const error = new Error('send failed');
        const job = {
            notification: 'BrokenJob',
            data: { foo: 'bar' },
            recipient: { id: '123' },
        };
        serializer.hydrate.mockReturnValueOnce(job.data);
        notifications.send.mockRejectedValueOnce(error);
        queueAdapter.work.mockImplementation(async (handler: (job: any) => Promise<void>) => {
            await handler(job);
        });

        await service.start(2);

        expect(serializer.hydrate).toHaveBeenCalledWith('BrokenJob', job.data);
        expect(notifications.send).toHaveBeenCalledWith(job.data, job.recipient, true);
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            'Error processing job (BrokenJob): send failed',
            error.stack,
        );
    });
});
