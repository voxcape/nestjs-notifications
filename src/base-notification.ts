import { Notification as Notification } from './notification.interface';
import { RecipientLike } from './types';
export abstract class BaseNotification<R extends RecipientLike = RecipientLike>
    implements Notification<R>
{
    /**
     * The type of the notification. Useful in cases where we need to identify the notification
     * class by its type.
     */
    static type: string;

    /**
     * @inheritDoc
     */
    public shouldQueue(): boolean {
        return false;
    }

    /**
     * @inheritDoc
     */
    public toMail?(recipient: R): any;

    /**
     * @inheritDoc
     */
    public toDatabase?(recipient: R): any;

    /**
     * @inheritDoc
     */
    public toBroadcast?(recipient: R): any;

    /**
     * @inheritDoc
     */
    public broadcastOn?(recipient: R): string | string[];

    /**
     * @inheritDoc
     */
    public channels(_recipient: R): string[] {
        return ['mail'];
    }
}
