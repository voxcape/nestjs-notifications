import { TestingModule } from '@nestjs/testing';
import { Injectable, Module } from '@nestjs/common';
import {
    NotificationModule,
    NotificationModuleOptions,
    NotificationOptionsFactory,
} from '../notification.module';
import { NotificationManager } from '../notification.manager';
import { BROADCAST_ADAPTER, QUEUE_ADAPTER, NOTIFICATION_MODULE_OPTIONS } from '../constants';
import { TestModuleHelper } from './helpers/test-module.helper';
import { NotificationWorkerService } from '../notification-worker.service';

@Injectable()
class InMemoryBroadcastAdapter {
    async publish(): Promise<void> {}
}

@Injectable()
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
    let testHelper: TestModuleHelper;
    let module: TestingModule;

    beforeEach(() => {
        testHelper = new TestModuleHelper();
    });

    afterEach(async () => {
        await testHelper.cleanup();
    });

    it('registers NotificationManager with forRoot', async () => {
        module = await testHelper.create({
            module: NotificationModule.forRoot({}),
            overrides: [
                { token: BROADCAST_ADAPTER, useClass: InMemoryBroadcastAdapter },
                { token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
            ],
        });

        const manager = module.get(NotificationManager);
        expect(manager).toBeInstanceOf(NotificationManager);
    });

    describe('provider decoupling', () => {
        it('does not register QUEUE_ADAPTER when no queue is configured', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({ autoDiscoverNotifications: false }),
            });

            expect(() => module.get(QUEUE_ADAPTER)).toThrow();
        });

        it('does not register BROADCAST_ADAPTER when no broadcast adapter is configured', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({ autoDiscoverNotifications: false }),
            });

            expect(() => module.get(BROADCAST_ADAPTER)).toThrow();
        });

        it('does not register NotificationWorkerService when no queue is configured', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({ autoDiscoverNotifications: false }),
            });

            expect(() => module.get(NotificationWorkerService)).toThrow();
        });

        it('registers QUEUE_ADAPTER and NotificationWorkerService when queueAdapter is provided', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({
                    autoDiscoverNotifications: false,
                    queueAdapter: { provide: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                }),
            });

            expect(module.get(QUEUE_ADAPTER)).toBeInstanceOf(InMemoryQueueAdapter);
            expect(module.get(NotificationWorkerService)).toBeInstanceOf(NotificationWorkerService);
        });

        it('registers BROADCAST_ADAPTER when broadcastAdapter is provided', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({
                    autoDiscoverNotifications: false,
                    broadcastAdapter: {
                        provide: BROADCAST_ADAPTER,
                        useClass: InMemoryBroadcastAdapter,
                    },
                }),
            });

            expect(module.get(BROADCAST_ADAPTER)).toBeInstanceOf(InMemoryBroadcastAdapter);
        });

        it('does not register BROADCAST_ADAPTER when queueAdapter is provided but not broadcastAdapter', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({
                    autoDiscoverNotifications: false,
                    queueAdapter: { provide: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                }),
            });

            expect(() => module.get(BROADCAST_ADAPTER)).toThrow();
        });

        it('does not register NotificationWorkerService when broadcastAdapter is provided but not queueAdapter', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({
                    autoDiscoverNotifications: false,
                    broadcastAdapter: {
                        provide: BROADCAST_ADAPTER,
                        useClass: InMemoryBroadcastAdapter,
                    },
                }),
            });

            expect(() => module.get(NotificationWorkerService)).toThrow();
        });

        it('registers worker providers when worker.enabled is true', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRoot({
                    autoDiscoverNotifications: false,
                    worker: { enabled: true },
                }),
                overrides: [{ token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter }],
            });

            expect(module.get(NotificationWorkerService)).toBeInstanceOf(NotificationWorkerService);
        });
    });

    describe('forRootAsync', () => {
        it('registers with useFactory pattern', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRootAsync({
                    imports: [MockConfigModule],
                    useFactory: (config: MockConfigService) => ({
                        autoDiscoverNotifications: config.get('AUTO_DISCOVER') as boolean,
                        worker: {
                            enabled: false,
                        },
                    }),
                    inject: [MockConfigService],
                }),
                overrides: [
                    { token: BROADCAST_ADAPTER, useClass: InMemoryBroadcastAdapter },
                    { token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                ],
            });

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
        });

        it('registers with useClass pattern', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRootAsync({
                    imports: [MockConfigModule],
                    useClass: NotificationConfigFactory,
                }),
                overrides: [
                    { token: BROADCAST_ADAPTER, useClass: InMemoryBroadcastAdapter },
                    { token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                ],
            });

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

            module = await testHelper.create({
                module: NotificationModule.forRootAsync({
                    imports: [ConfigWithFactory],
                    useExisting: NotificationConfigFactory,
                }),
                overrides: [
                    { token: BROADCAST_ADAPTER, useClass: InMemoryBroadcastAdapter },
                    { token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                ],
            });

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
            expect(options.worker?.enabled).toBe(true);
        });

        it('supports async factory functions', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRootAsync({
                    imports: [MockConfigModule],
                    useFactory: async (config: MockConfigService) => {
                        await new Promise((resolve) => setTimeout(resolve, 10));
                        return {
                            autoDiscoverNotifications: config.get('AUTO_DISCOVER') as boolean,
                        };
                    },
                    inject: [MockConfigService],
                }),
                overrides: [
                    { token: BROADCAST_ADAPTER, useClass: InMemoryBroadcastAdapter },
                    { token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                ],
            });

            const manager = module.get(NotificationManager);
            const options = module.get(NOTIFICATION_MODULE_OPTIONS) as NotificationModuleOptions;

            expect(manager).toBeInstanceOf(NotificationManager);
            expect(options.autoDiscoverNotifications).toBe(false);
        });

        it('supports imports in async options', async () => {
            module = await testHelper.create({
                module: NotificationModule.forRootAsync({
                    imports: [MockConfigModule],
                    useFactory: (config: MockConfigService) => ({
                        autoDiscoverNotifications: config.get('AUTO_DISCOVER') as boolean,
                    }),
                    inject: [MockConfigService],
                }),
                overrides: [
                    { token: BROADCAST_ADAPTER, useClass: InMemoryBroadcastAdapter },
                    { token: QUEUE_ADAPTER, useClass: InMemoryQueueAdapter },
                ],
            });

            const manager = module.get(NotificationManager);
            expect(manager).toBeInstanceOf(NotificationManager);
        });
    });
});
