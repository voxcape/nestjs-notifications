import { Test } from '@nestjs/testing';
import { NotificationModule } from '../notification.module';
import { NotificationManager } from '../notification.manager';
import { BROADCAST_ADAPTER, QUEUE_ADAPTER } from '../constants';

class InMemoryBroadcastAdapter {
    async publish(): Promise<void> {}
}
class InMemoryQueueAdapter {
    async enqueue(): Promise<void> {}
}

describe('NotificationModule', () => {
    it('registers NotificationManager', async () => {
        const module = await Test.createTestingModule({
            imports: [
                NotificationModule.forRoot({
                    broadcastAdapter: {
                        provide: BROADCAST_ADAPTER,
                        useClass: InMemoryBroadcastAdapter,
                    },
                    queueAdapter: { provide: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                }),
            ],
        }).compile();

        const manager = module.get(NotificationManager);
        expect(manager).toBeInstanceOf(NotificationManager);
    });
});
