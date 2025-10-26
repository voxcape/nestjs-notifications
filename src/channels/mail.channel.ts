import { Inject, Injectable, Optional } from '@nestjs/common';
import { NotificationChannel } from '../interfaces/channel.interface';
import { MAIL_ADAPTER } from '../constants';
import { MailAdapter } from '../interfaces/mail-adapter.interface';
import { Notification } from '../notification.interface';
import { RecipientLike } from '../types';

@Injectable()
export class MailChannel implements NotificationChannel {
    readonly name = 'mail';

    constructor(
        @Optional()
        @Inject(MAIL_ADAPTER)
        private readonly adapter?: MailAdapter,
    ) {}

    /**
     * @inheritDoc
     */
    async send(notification: Notification, recipient: RecipientLike): Promise<void> {
        const message = notification.toMail?.(recipient);
        if (message && this.adapter) await this.adapter.sendMail(message, recipient);
    }
}
