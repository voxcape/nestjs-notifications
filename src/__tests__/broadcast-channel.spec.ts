import { BroadcastChannel } from '../channels/broadcast.channel';
import { BroadcastAdapter } from '../interfaces/broadcast-adapter.interface';

class MockBroadcastAdapter implements BroadcastAdapter {
    published: { channel: string; payload: any }[] = [];
    async publish(channel: string, payload: any): Promise<void> {
        this.published.push({ channel, payload });
    }
}

describe('BroadcastChannel', () => {
    it('publishes to all broadcastOn channels', async () => {
        const adapter = new MockBroadcastAdapter();
        const channel = new BroadcastChannel(adapter as any);

        const notif = {
            broadcastOn: () => ['user.1', 'user.2'],
            toBroadcast: () => ({ message: 'Ping' }),
        };

        await channel.send(notif as any, { id: 1 });

        expect(adapter.published.length).toBe(2);
        expect(adapter.published[0].channel).toBe('user.1');
        expect(adapter.published[1].payload.message).toBe('Ping');
    });
});
