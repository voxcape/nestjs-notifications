import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { QUEUE_ADAPTER } from './constants';
import { QueueAdapter, QueueWorkerConfig } from './interfaces/queue-adapter.interface';
import { NotificationManager } from './notification.manager';
import { NotificationSerializer } from './notification.serializer';

@Injectable()
export class NotificationWorkerService {
    private readonly logger = new Logger(NotificationWorkerService.name);

    constructor(
        @Inject(QUEUE_ADAPTER) private readonly queueAdapter: QueueAdapter,
        private readonly notifications: NotificationManager,
        @Optional() private readonly serializer?: NotificationSerializer,
    ) {}

    /**
     * Starts the notification worker to process jobs from the queue adapter.
     * Configures a stop controller to handle termination signals and manages job processing with proper logging.
     *
     * @param {number} [blockTimeout] - Optional block timeout in seconds before processing jobs,
     * defaults to an environment variable `QUEUE_BLOCK_TIMEOUT` or 5 seconds if not set.
     * @return {Promise<void>} A promise resolved when the worker starts and processes jobs,
     * or rejects if an error occurs during execution.
     */
    async start(blockTimeout?: number): Promise<void> {
        if (typeof this.queueAdapter.work !== 'function') {
            throw new Error(
                `The injected queue adapter (${this.queueAdapter.constructor.name}) does not implement work(processJob, config).`,
            );
        }

        const config: QueueWorkerConfig = {
            blockTimeoutSeconds: this.resolveBlockTimeout(blockTimeout),
        };

        const stopController = new AbortController();
        config.stopSignal = stopController.signal;

        const stop = (signal: NodeJS.Signals) => {
            if (!stopController.signal.aborted) {
                this.logger.log(`Stop signal (${signal}) received. Shutting down worker...`);
                stopController.abort();
            }
        };

        process.on('SIGINT', stop);
        process.on('SIGTERM', stop);

        this.logger.log('Notification worker started');
        this.logger.log(`Using adapter: ${this.queueAdapter.constructor.name}`);
        this.logger.log(`Block timeout: ${config.blockTimeoutSeconds}s`);

        try {
            await this.queueAdapter.work(async (job) => {
                const typeName = job.notification ?? 'Unknown';
                this.logger.log(`Processing job type: ${typeName}`);
                try {
                    const { data, recipient } = job;
                    const notification = this.serializer
                        ? this.serializer.hydrate(typeName, data)
                        : data;
                    await this.notifications.send(notification, recipient, true);
                    this.logger.log(
                        `Processed job: ${typeName} => ${recipient?.email ?? recipient?.id ?? 'unknown-recipient'}`,
                    );
                } catch (error) {
                    this.logger.error(
                        `Error processing job (${typeName}): ${(error as Error).message}`,
                        (error as Error).stack,
                    );
                }
            }, config);
        } finally {
            process.removeListener('SIGINT', stop);
            process.removeListener('SIGTERM', stop);
            this.logger.log('Worker stopped gracefully.');
        }
    }

    private resolveBlockTimeout(blockTimeout?: number): number {
        if (typeof blockTimeout === 'number' && !Number.isNaN(blockTimeout)) {
            return blockTimeout;
        }

        const envValue = process.env.QUEUE_BLOCK_TIMEOUT;
        if (envValue !== undefined) {
            const parsed = Number(envValue);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }

        return 5;
    }
}
