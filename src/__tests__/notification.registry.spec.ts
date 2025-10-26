import { BaseNotification } from '../base-notification';
import {
    clearNotificationRegistry,
    getNotificationConstructor,
    getRegisteredTypes,
    registerNotificationType,
} from '../notification.registry';

describe('notification.registry', () => {
    beforeEach(() => {
        clearNotificationRegistry();
    });

    afterEach(() => {
        clearNotificationRegistry();
    });

    it('registers and retrieves a notification constructor', () => {
        class EmailNotification extends BaseNotification {}

        registerNotificationType('email', EmailNotification);

        expect(getNotificationConstructor('email')).toBe(EmailNotification);
    });

    it('returns undefined when type is unknown', () => {
        expect(getNotificationConstructor('missing')).toBeUndefined();
    });

    it('lists all registered types in insertion order', () => {
        class EmailNotification extends BaseNotification {}
        class SmsNotification extends BaseNotification {}

        registerNotificationType('email', EmailNotification);
        registerNotificationType('sms', SmsNotification);

        expect(getRegisteredTypes()).toEqual(['email', 'sms']);
    });

    it('overrides existing registration when type re-registered', () => {
        class FirstNotification extends BaseNotification {}
        class SecondNotification extends BaseNotification {}

        registerNotificationType('email', FirstNotification);
        registerNotificationType('email', SecondNotification);

        expect(getNotificationConstructor('email')).toBe(SecondNotification);
    });

    it('clears registry entries', () => {
        class EmailNotification extends BaseNotification {}

        registerNotificationType('email', EmailNotification);
        clearNotificationRegistry();

        expect(getRegisteredTypes()).toEqual([]);
        expect(getNotificationConstructor('email')).toBeUndefined();
    });
});
