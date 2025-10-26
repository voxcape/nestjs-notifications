import { BroadcastAdapter } from '../../interfaces/broadcast-adapter.interface';

export class MockBroadcastAdapter implements BroadcastAdapter {
    published: { channel: string; payload: any }[] = [];
    async publish(channel: string, payload: any): Promise<void> {
        this.published.push({ channel, payload });
    }
}

// Trivial test to ensure Jest does not fail on empty test suite
describe('MockBroadcastAdapter helper', () => {
    it('noop', () => {
        expect(true).toBe(true);
    });
});
