import { Test } from '@nestjs/testing';
import { NotificationManager } from '../notification.manager';
import { NOTIFICATION_CHANNELS, QUEUE_ADAPTER } from '../constants';
import { NotificationChannel } from '../interfaces/channel.interface';
import { MockQueueAdapter } from './mocks/mock-queue.adapter';
import { Notification } from '../notification.interface';
import { BaseNotification as ANotification } from '../base-notification';
import { RecipientLike } from '../types';
import { NotificationSerializer } from '../notification.serializer';

class TestChannel implements NotificationChannel {
    name = 'mail';
    sent: any[] = [];
    async send(notification: Notification, recipient: RecipientLike) {
        this.sent.push({ notification, recipient });
    }
}

class BasicNotification extends ANotification {
    channels() {
        return ['mail'];
    }
}
class QueueableNotification extends BasicNotification {
    shouldQueue() {
        return true;
    }
}

describe('NotificationManager', () => {
    let manager: NotificationManager;
    let channel: TestChannel;
    let queue: MockQueueAdapter;
    let serializer: { register: jest.Mock };

    beforeEach(async () => {
        serializer = { register: jest.fn() };
        const module = await Test.createTestingModule({
            providers: [
                NotificationManager,
                { provide: NOTIFICATION_CHANNELS, useValue: [new TestChannel()] },
                { provide: QUEUE_ADAPTER, useClass: MockQueueAdapter },
                { provide: NotificationSerializer, useValue: serializer },
            ],
        }).compile();

        manager = module.get(NotificationManager);
        channel = module.get(NOTIFICATION_CHANNELS)[0];
        queue = module.get(QUEUE_ADAPTER);
    });

    it('queues notification if ShouldQueue', async () => {
        const notif = new QueueableNotification();
        await manager.send(notif, { email: 'queue@test.com' });
        expect(queue.queued.length).toBe(1);
        expect(channel.sent.length).toBe(0);
        expect(serializer.register).toHaveBeenCalledWith(notif);
    });

    it('skips queue when skipQueue=true', async () => {
        const notif = new QueueableNotification();
        await manager.send(notif, { email: 'skip@test.com' }, true);
        expect(queue.queued.length).toBe(0);
        expect(channel.sent.length).toBe(1);
        expect(serializer.register).not.toHaveBeenCalled();
    });
});
