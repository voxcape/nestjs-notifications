import { Inject, Injectable, Optional } from '@nestjs/common';
import { NotificationChannel } from '../interfaces/channel.interface';
import { BROADCAST_ADAPTER } from '../constants';
import { BroadcastAdapter } from '../interfaces/broadcast-adapter.interface';
import { Notification } from '../notification.interface';
import { RecipientLike } from '../types';
import { ensureArray } from '../utils/ensure-array';

@Injectable()
export class BroadcastChannel implements NotificationChannel {
    readonly name = 'broadcast';

    constructor(
        @Optional()
        @Inject(BROADCAST_ADAPTER)
        private readonly adapter?: BroadcastAdapter,
    ) {}

    /**
     * @inheritDoc
     */
    async send(notification: Notification, recipient: RecipientLike): Promise<void> {
        const payload = notification.toBroadcast?.(recipient);
        const targets = ensureArray(notification.broadcastOn?.(recipient));

        if (!payload || !targets.length || !this.adapter) return;

        for (const channel of targets) {
            await this.adapter.publish(channel, payload);
        }
    }
}
