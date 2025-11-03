import { Test } from '@nestjs/testing';
import { Injectable, Module } from '@nestjs/common';
import {
    NotificationModule,
    NotificationModuleOptions,
    NotificationOptionsFactory,
} from '../notification.module';
import { NotificationManager } from '../notification.manager';
import { BROADCAST_ADAPTER, QUEUE_ADAPTER, NOTIFICATION_MODULE_OPTIONS } from '../constants';

class InMemoryBroadcastAdapter {
    async publish(): Promise<void> {}
}
class InMemoryQueueAdapter {
    async enqueue(): Promise<void> {}
}

@Injectable()
class MockConfigService {
    get(key: string): unknown {
        const config: Record<string, unknown> = {
            AUTO_DISCOVER: false,
            WORKER_ENABLED: true,
        };
        return config[key];
    }
}

@Injectable()
class NotificationConfigFactory implements NotificationOptionsFactory {
    constructor(private readonly config: MockConfigService) {}

    createNotificationOptions(): NotificationModuleOptions {
        return {
            autoDiscoverNotifications: this.config.get('AUTO_DISCOVER') as boolean,
            worker: {
                enabled: this.config.get('WORKER_ENABLED') as boolean,
            },
        };
    }
}

@Module({
    providers: [MockConfigService],
    exports: [MockConfigService],
})
class MockConfigModule {}

describe('NotificationModule', () => {
    it('registers NotificationManager with forRoot', async () => {
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

    describe('forRootAsync', () => {
        it('registers with useFactory pattern', async () => {
            const module = await Test.createTestingModule({
                imports: [
                    NotificationModule.forRootAsync({
                        imports: [MockConfigModule],
                        useFactory: (config: MockConfigService) => ({
                            autoDiscoverNotifications: config.get('AUTO_DISCOVER') as boolean,
                            worker: {
                                enabled: config.get('WORKER_ENABLED') as boolean,
                            },
                        }),
                        inject: [MockConfigService],
                    }),
                ],
            }).compile();

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
            expect(options.worker?.enabled).toBe(true);
        });

        it('registers with useClass pattern', async () => {
            const module = await Test.createTestingModule({
                imports: [
                    NotificationModule.forRootAsync({
                        imports: [MockConfigModule],
                        useClass: NotificationConfigFactory,
                    }),
                ],
            }).compile();

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
            expect(options.worker?.enabled).toBe(true);
        });

        it('registers with useExisting pattern', async () => {
            @Module({
                providers: [MockConfigService, NotificationConfigFactory],
                exports: [NotificationConfigFactory],
            })
            class ConfigWithFactory {}

            const module = await Test.createTestingModule({
                imports: [
                    NotificationModule.forRootAsync({
                        imports: [ConfigWithFactory],
                        useExisting: NotificationConfigFactory,
                    }),
                ],
            }).compile();

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
            expect(options.worker?.enabled).toBe(true);
        });

        it('supports async factory functions', async () => {
            const module = await Test.createTestingModule({
                imports: [
                    NotificationModule.forRootAsync({
                        imports: [MockConfigModule],
                        useFactory: async (config: MockConfigService) => {
                            await new Promise((resolve) => setTimeout(resolve, 10));
                            return {
                                autoDiscoverNotifications: config.get('AUTO_DISCOVER') as boolean,
                            };
                        },
                        inject: [MockConfigService],
                    }),
                ],
            }).compile();

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
        });

        it('supports imports in async options', async () => {
            const module = await Test.createTestingModule({
                imports: [
                    NotificationModule.forRootAsync({
                        imports: [MockConfigModule],
                        useFactory: (config: MockConfigService) => ({
                            autoDiscoverNotifications: config.get('AUTO_DISCOVER') as boolean,
                        }),
                        inject: [MockConfigService],
                    }),
                ],
            }).compile();

            const manager = module.get(NotificationManager);
            expect(manager).toBeInstanceOf(NotificationManager);
        });
    });
});
