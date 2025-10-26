import { Logger } from '@nestjs/common';
import { BaseNotification } from '../base-notification';
import { NotificationSerializer } from '../notification.serializer';
import { clearNotificationRegistry, getNotificationConstructor } from '../notification.registry';
import { RecipientLike } from '../types';

const createInvalidNotification = (): BaseNotification => {
    const invalid = Object.create(BaseNotification.prototype);
    invalid.constructor = {};
    return invalid as BaseNotification;
};

describe('NotificationSerializer', () => {
    let serializer: NotificationSerializer;

    beforeEach(() => {
        clearNotificationRegistry();
        jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        serializer = new NotificationSerializer();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        clearNotificationRegistry();
    });

    it('registers notification using explicit static type', () => {
        class StaticTypeNotification extends BaseNotification {
            static type = 'static-type';
        }

        const notification = new StaticTypeNotification();

        serializer.register(notification);

        expect(getNotificationConstructor('static-type')).toBe(StaticTypeNotification);
    });

    it('throws when registering notification without type or constructor name', () => {
        const invalidNotification = createInvalidNotification();

        expect(() => serializer.register(invalidNotification)).toThrow(
            'Cannot register notification: missing type or constructor name.',
        );
    });

    it('serializes notification payload with type, recipient, and timestamp', () => {
        class SerializableNotification extends BaseNotification {
            static type = 'serializable';
        }

        const notification = new SerializableNotification();
        const recipient: RecipientLike = { email: 'serializable@example.com' };
        const now = 1_700_000_000_000;

        jest.spyOn(Date, 'now').mockReturnValue(now);

        const payload = serializer.serialize(notification, recipient);

        expect(payload).toEqual({
            notification: 'serializable',
            data: notification,
            recipient,
            timestamp: now,
        });
    });

    it('throws when serializing notification without type or constructor name', () => {
        const invalidNotification = createInvalidNotification();

        expect(() =>
            serializer.serialize(invalidNotification, { email: 'missing@example.com' }),
        ).toThrow('Cannot serialize notification: missing type or constructor name.');
    });

    it('hydrates registered notification instance', () => {
        class HydratableNotification extends BaseNotification {
            static type = 'hydrated';
            message?: string;
        }

        serializer.register(new HydratableNotification());

        const hydrated = serializer.hydrate('hydrated', {
            message: 'Hello',
        } as HydratableNotification);

        expect(hydrated).toBeInstanceOf(HydratableNotification);
        expect(hydrated.message).toBe('Hello');
    });

    it('throws when hydrating unknown notification type', () => {
        expect(() => serializer.hydrate('unknown-type', {} as BaseNotification)).toThrow(
            'Unknown notification type: unknown-type',
        );
    });
});
