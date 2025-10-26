import { registerNotificationType } from '../notification.registry';

/**
 * A decorator function used to define a notification type and register it.
 *
 * @param {string} type - The identifier for the notification type.
 * @return {ClassDecorator} A class decorator function that assigns the notification type to the target class and registers it.
 */
export function NotificationType(type: string): ClassDecorator {
    return (target: any) => {
        target.type = type;
        registerNotificationType(type, target);
    };
}
