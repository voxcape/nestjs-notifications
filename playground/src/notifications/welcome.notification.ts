import { BaseNotification, NotificationType } from '@voxcape/nestjs-notifications';
import { RecipientLike, DatabaseRecord } from '@voxcape/nestjs-notifications';

@NotificationType('welcome')
export class WelcomeNotification extends BaseNotification {
    // To add mail delivery, change channels() to return ['database', 'mail']
    // and set SMTP env vars in playground/.env, then implement toMail() below.
    public channels(_recipient: RecipientLike): string[] {
        return ['database'];
    }

    public toDatabase(recipient: RecipientLike): DatabaseRecord {
        return {
            userId: recipient.id ?? 0,
            type: 'welcome',
            title: 'Welcome!',
            body: `Hello ${recipient.name ?? 'there'}, welcome to our platform.`,
            meta: { channel: 'database' },
        };
    }
}
