import { DatabaseChannel } from '../channels/database.channel';
import { DatabaseAdapter } from '../interfaces/database-adapter.interface';
import { Notification } from '../notification.interface';

const recipient = { id: 1 };

function createNotification(overrides: Partial<Notification> = {}): Notification {
    return {
        channels: jest.fn().mockReturnValue(['database']),
        ...overrides,
    } as Notification;
}

describe('DatabaseChannel', () => {
    it('persists database record when adapter is provided', async () => {
        const record = { userId: 1, type: 'test' } as any;
        const notification = createNotification({
            toDatabase: jest.fn().mockReturnValue(record),
        });
        const adapter: DatabaseAdapter = {
            save: jest.fn().mockResolvedValue(undefined),
        };
        const channel = new DatabaseChannel(adapter);

        await channel.send(notification, recipient);

        expect(notification.toDatabase).toHaveBeenCalledWith(recipient);
        expect(adapter.save).toHaveBeenCalledWith(record);
    });

    it('skips persistence when adapter is missing', async () => {
        const notification = createNotification({
            toDatabase: jest.fn().mockReturnValue({ userId: 1, type: 'test' }),
        });
        const channel = new DatabaseChannel();

        await expect(channel.send(notification, recipient)).resolves.toBeUndefined();
        expect(notification.toDatabase).toHaveBeenCalledWith(recipient);
    });

    it('skips persistence when notification does not provide record', async () => {
        const notification = createNotification({
            toDatabase: jest.fn().mockReturnValue(undefined),
        });
        const adapter: DatabaseAdapter = {
            save: jest.fn().mockResolvedValue(undefined),
        };
        const channel = new DatabaseChannel(adapter);

        await channel.send(notification, recipient);

        expect(notification.toDatabase).toHaveBeenCalledWith(recipient);
        expect(adapter.save).not.toHaveBeenCalled();
    });
});
