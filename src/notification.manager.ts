import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { NOTIFICATION_CHANNELS, QUEUE_ADAPTER } from './constants';
import { NotificationChannel } from './interfaces/channel.interface';
import { Notification } from './notification.interface';
import { RecipientLike } from './types';
import { QueueAdapter } from './interfaces/queue-adapter.interface';
import { NotificationSerializer } from './notification.serializer';

@Injectable()
export class NotificationManager {
    private readonly logger = new Logger(NotificationManager.name);
    constructor(
        @Optional()
        @Inject(NOTIFICATION_CHANNELS)
        private readonly channels: NotificationChannel[] = [],
        @Optional()
        @Inject(QUEUE_ADAPTER)
        private readonly queueAdapter?: QueueAdapter,
        @Optional()
        private readonly serializer?: NotificationSerializer,
    ) {}

    async send(
        notification: Notification,
        recipient: RecipientLike,
        skipQueue = false,
        attempt: number = 0,
    ): Promise<void> {
        try {
            if (!skipQueue && this.queueAdapter && notification.shouldQueue()) {
                this.serializer?.register(notification);
                await this.queueAdapter.enqueue(notification, recipient);
                return;
            }

            const channelNames = new Set(
                (notification.channels(recipient) || []).map((c) => c.toLowerCase()),
            );
            const available = this.channels.filter((channel) =>
                channelNames.has(channel.name.toLowerCase()),
            );

            await Promise.all(available.map((channel) => channel.send(notification, recipient)));
        } catch (error) {
            await this.handleRetry(notification, recipient, error as Error, attempt);
        }
    }

    /**
     * Handles the retry logic for a failed notification.
     *
     * @param {Notification} notification - The notification instance that failed to send.
     * @param {RecipientLike} recipient - The recipient information for the notification.
     * @param {Error} error - The error that caused the notification to fail.
     * @param {number} attempt - The current retry attempt number.
     * @return {Promise<void>} A promise that resolves when the retry logic is completed.
     */
    private async handleRetry(
        notification: Notification,
        recipient: RecipientLike,
        error: Error,
        attempt: number = 0,
    ): Promise<void> {
        const maxAttempts = notification.retryLimit ?? 0;
        const nextAttempt = attempt + 1;

        if (nextAttempt > maxAttempts) {
            this.logger?.error(
                `Notification ${notification.constructor.name} failed permanently after ${attempt} attempts.`,
                error.stack,
            );
            return;
        }

        const shouldRetry = notification.shouldRetry?.(error, attempt) ?? true;

        if (!shouldRetry) {
            this.logger?.warn(
                `Notification ${notification.constructor.name} skipped retry after ${attempt} attempts.`,
            );
            return;
        }

        const backoffSeconds =
            notification.backoff?.(nextAttempt, error) ??
            Math.min(60, (notification.delaySeconds ?? 5) * Math.pow(2, attempt));

        this.logger?.warn(
            `Retrying ${notification.constructor.name} (attempt ${nextAttempt}/${maxAttempts}) after ${backoffSeconds}s`,
        );

        if (!this.queueAdapter) {
            this.logger?.error('No queue adapter configured; cannot retry notification.');
            return;
        }

        await this.queueAdapter.enqueue(notification, recipient, {
            attempt: nextAttempt,
            delaySeconds: backoffSeconds,
        });
    }
}
