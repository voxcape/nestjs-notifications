import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { BaseNotification } from './base-notification';
import { getNotificationConstructor, registerNotificationType } from './notification.registry';
import { RecipientLike, SerializedNotification } from './types';

@Injectable()
export class NotificationSerializer {
    private readonly logger = new Logger(NotificationSerializer.name);

    /**
     * Registers a notification class type so it can be hydrated later.
     * This is useful when queueing notifications to ensure their constructors are known.
     */
    register(notification: BaseNotification): void {
        const ctor: any = notification.constructor;
        const type = ctor.type ?? ctor.name;
        if (!type) {
            throw new Error(`Cannot register notification: missing type or constructor name.`);
        }
        registerNotificationType(type, ctor);
        this.logger.log(`Registered notification type: ${type}`);
    }

    /**
     * Serializes a notification into a payload object including its type, data, recipient, and timestamp.
     *
     * @param {BaseNotification} notification - The notification instance to serialize.
     * @param {RecipientLike} recipient - The recipient information for the notification.
     * @return {object} An object containing the serialized notification data, recipient information, and a timestamp.
     * @throws {Error} If the notification type or constructor name is missing.
     */
    serialize(notification: BaseNotification, recipient: RecipientLike): SerializedNotification {
        const ctor: any = notification.constructor;
        const type = ctor.type ?? ctor.name;

        if (!type) {
            throw new Error(`Cannot serialize notification: missing type or constructor name.`);
        }

        return {
            notification: type,
            data: notification,
            recipient,
            timestamp: Date.now(),
        };
    }

    /**
     * Reconstructs an instance of a notification object from plain data.
     *
     * @param {string} typeName - The name of the notification type to be hydrated.
     * @param data - The plain data to be converted into a notification instance.
     * @return T - The instance of the notification object matching the specified type.
     */
    hydrate<T extends BaseNotification>(typeName: string, data: T): T {
        const ctor = getNotificationConstructor(typeName);
        if (!ctor) {
            throw new Error(`Unknown notification type: ${typeName}`);
        }

        return plainToInstance(ctor, data) as unknown as T;
    }
}
