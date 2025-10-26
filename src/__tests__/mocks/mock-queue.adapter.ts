import { QueueAdapter } from '../../interfaces/queue-adapter.interface';
import { Notification } from '../../notification.interface';
import { RecipientLike } from '../../types';

export class MockQueueAdapter implements QueueAdapter {
    queued: any[] = [];
    async enqueue(notification: Notification, recipient: RecipientLike) {
        this.queued.push({ notification, recipient });
    }
}

// Trivial test to ensure Jest does not fail on empty test suite
describe('MockQueueAdapter helper', () => {
    it('noop', () => {
        expect(true).toBe(true);
    });
});
