import { Notification } from '../notification.interface';
import { RecipientLike } from '../types';

export interface NotificationChannel {
    readonly name: string;

    /**
     * Sends a notification to a specified recipient.
     *
     * @param {Notification} notification - The notification object to be sent.
     * @param {RecipientLike} recipient - The recipient to whom the notification will be sent.
     * @return {Promise<void>} A promise that resolves when the notification is successfully sent.
     */
    send(notification: Notification, recipient: RecipientLike): Promise<void>;
}
