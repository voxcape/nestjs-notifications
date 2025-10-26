import { Inject, Injectable, Optional } from '@nestjs/common';
import { NotificationChannel } from '../interfaces/channel.interface';
import { DATABASE_ADAPTER } from '../constants';
import { DatabaseAdapter } from '../interfaces/database-adapter.interface';
import { Notification } from '../notification.interface';
import { RecipientLike } from '../types';

@Injectable()
export class DatabaseChannel implements NotificationChannel {
    readonly name = 'database';

    constructor(
        @Optional()
        @Inject(DATABASE_ADAPTER)
        private readonly adapter?: DatabaseAdapter,
    ) {}

    /**
     * @inheritDoc
     */
    async send(notification: Notification, recipient: RecipientLike): Promise<void> {
        const record = notification.toDatabase?.(recipient);
        if (record && this.adapter) await this.adapter.save(record);
    }
}
