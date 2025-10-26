import { Inject, Injectable, Optional } from '@nestjs/common';
import { NOTIFICATION_CHANNELS, QUEUE_ADAPTER } from './constants';
import { NotificationChannel } from './interfaces/channel.interface';
import { Notification } from './notification.interface';
import { RecipientLike } from './types';
import { QueueAdapter } from './interfaces/queue-adapter.interface';
import { NotificationSerializer } from './notification.serializer';

@Injectable()
export class NotificationManager {
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
    ): Promise<void> {
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
    }
}
