import {
    DynamicModule,
    Global,
    Inject,
    Logger,
    Module,
    ModuleMetadata,
    OnModuleInit,
    Provider,
    Type,
} from '@nestjs/common';
import {
    NOTIFICATION_CHANNELS,
    MAIL_ADAPTER,
    BROADCAST_ADAPTER,
    QUEUE_ADAPTER,
    NOTIFICATION_MODULE_OPTIONS,
} from './constants';
import { NotificationManager } from './notification.manager';
import { MailChannel } from './channels/mail.channel';
import { DatabaseChannel } from './channels/database.channel';
import { BroadcastChannel } from './channels/broadcast.channel';
import { NodemailerMailAdapter } from './adapters/nodemailer-mail.adapter';
import { RedisBroadcastAdapter } from './adapters/redis-broadcast.adapter';
import { RedisQueueAdapter } from './adapters/redis-queue.adapter';
import { NotificationWorkerCommand } from './commands/notification-worker.command';
import { NotificationSerializer } from './notification.serializer';
import { autoDiscoverNotifications, isSubclassOf } from './notification-type-loader';
import { registerNotificationType } from './notification.registry';
import { BaseNotification } from './base-notification';
import { NotificationWorkerConfig } from './types';
import { NotificationWorkerService } from './notification-worker.service';

export interface NotificationModuleOptions {
    channels?: Provider[];
    mailAdapter?: Provider;
    databaseAdapter?: Provider;
    /**
     * An optional property that specifies the broadcast adapter to be used.
     * This adapter acts as a provider for handling communication or broadcasting events
     * between different parts of the application.
     * Can be set to customize or override the default broadcast mechanism.
     *
     * @type {Provider | undefined}
     */
    broadcastAdapter?: Provider;
    /**
     * Represents an optional provider for a queue adapter.
     * The queue adapter is used to interact with a specific queuing system or service.
     * It allows for the integration and management of tasks or messages being processed in the queue.
     *
     * This property is optional and may not always be set, depending on the use case or implementation.
     * When assigned, it must be a valid provider instance.
     *
     * @type {Provider | undefined}
     */
    queueAdapter?: Provider;
    /**
     * Indicates whether the system should automatically discover notifications.
     * If set to `true`, notifications may be automatically detected and handled
     * without requiring explicit setup by the user. If set to `false`,
     * notifications must be manually configured.
     * This property is optional.
     */
    autoDiscoverNotifications?: boolean;

    /**
     * An optional array of directory paths used for automatically discovering notification settings or files.
     * This property can be used to define specific directories that the system or application should scan
     * to identify and load notification-related resources.
     *
     * If not provided or set to undefined, the auto-discovery mechanism may not execute, or a default behavior
     * might be applied, depending on the implementation.
     */
    notificationAutoDiscoverDirectories?: string[];

    /**
     * An optional array of notification type classes to be registered manually.
     * Useful when auto-discovery is disabled or when you want to explicitly
     * register certain notifications.
     */
    notificationTypes?: Type<unknown>[];

    /**
     * Configuration for the internal worker responsible for processing
     * queued notification jobs. When `enabled` is true, the worker will
     * automatically start in this module's lifecycle.
     */
    worker?: NotificationWorkerConfig;
}

export interface NotificationOptionsFactory {
    createNotificationOptions(): Promise<NotificationModuleOptions> | NotificationModuleOptions;
}

export interface NotificationModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useExisting?: Type<NotificationOptionsFactory>;
    useClass?: Type<NotificationOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<NotificationModuleOptions> | NotificationModuleOptions;
    inject?: any[];
}

@Global()
@Module({})
export class NotificationModule implements OnModuleInit {
    private static options: NotificationModuleOptions = {};
    private readonly logger = new Logger(NotificationModule.name);

    constructor(
        private readonly workerService: NotificationWorkerService,
        @Inject(NOTIFICATION_MODULE_OPTIONS)
        private readonly moduleOptions: NotificationModuleOptions,
    ) {}

    /**
     * Configures the NotificationModule with optional settings and returns a dynamic module.
     *
     * @param {NotificationModuleOptions} [options={}] - The configuration options for initializing the NotificationModule. Options may include:
     *   - `channels`: Array of custom notification channels to be added to built-in channels.
     *   - `mailAdapter`: Custom mail adapter. If not provided, defaults to `NodemailerMailAdapter`.
     *   - `broadcastAdapter`: Custom broadcast adapter. If not provided, defaults to `RedisBroadcastAdapter`.
     *   - `queueAdapter`: Custom queue adapter. If not provided, defaults to `RedisQueueAdapter`.
     *   - `databaseAdapter`: Custom database adapter.
     * @return {DynamicModule} A configured dynamic module for NotificationModule, including providers and exports.
     */
    static forRoot(options: NotificationModuleOptions = {}): DynamicModule {
        this.options = options;
        const providers: Provider[] = this.createProviders(options);

        return {
            module: NotificationModule,
            providers,
            exports: [NotificationManager, NotificationSerializer],
        };
    }

    /**
     * Configures the NotificationModule asynchronously, allowing for dynamic option resolution.
     * Supports useFactory, useClass, and useExisting patterns.
     *
     * @param {NotificationModuleAsyncOptions} options - Async configuration options
     * @return {DynamicModule} A configured dynamic module for NotificationModule
     */
    static forRootAsync(options: NotificationModuleAsyncOptions): DynamicModule {
        const providers: Provider[] = [
            ...this.createAsyncProviders(options),
            NotificationManager,
            NotificationWorkerCommand,
            NotificationWorkerService,
            NotificationSerializer,
            {
                provide: NOTIFICATION_CHANNELS,
                useFactory: this.createChannelsFactory(),
                inject: [NOTIFICATION_MODULE_OPTIONS],
            },
            {
                provide: MAIL_ADAPTER,
                useFactory: this.createAdapterFactory('mailAdapter', NodemailerMailAdapter),
                inject: [NOTIFICATION_MODULE_OPTIONS],
            },
            {
                provide: BROADCAST_ADAPTER,
                useFactory: this.createAdapterFactory('broadcastAdapter', RedisBroadcastAdapter),
                inject: [NOTIFICATION_MODULE_OPTIONS],
            },
            {
                provide: QUEUE_ADAPTER,
                useFactory: this.createAdapterFactory('queueAdapter', RedisQueueAdapter),
                inject: [NOTIFICATION_MODULE_OPTIONS],
            },
        ];

        return {
            module: NotificationModule,
            imports: options.imports,
            providers,
            exports: [NotificationManager, NotificationSerializer],
        };
    }

    private static createProviders(options: NotificationModuleOptions): Provider[] {
        const providers: Provider[] = [
            NotificationManager,
            NotificationWorkerCommand,
            NotificationWorkerService,
            NotificationSerializer,
            {
                provide: NOTIFICATION_MODULE_OPTIONS,
                useValue: options,
            },
        ];

        const builtInChannels = [MailChannel, DatabaseChannel, BroadcastChannel];
        const userChannels = options.channels ?? [];
        const channelProviders = [...builtInChannels, ...userChannels];
        const channelTokens = channelProviders.map((provider) => {
            if (typeof provider === 'function') return provider as Type<unknown>;
            if (typeof provider === 'object' && provider && 'provide' in provider)
                return provider.provide as string | symbol | Type<unknown>;
            return provider as string | symbol | Type<unknown>;
        });

        providers.push(
            ...channelProviders,
            {
                provide: NOTIFICATION_CHANNELS,
                useFactory: (...instances: unknown[]) => instances,
                inject: channelTokens,
            },
            options.mailAdapter ?? { provide: MAIL_ADAPTER, useClass: NodemailerMailAdapter },
            options.broadcastAdapter ?? {
                provide: BROADCAST_ADAPTER,
                useClass: RedisBroadcastAdapter,
            },
            options.queueAdapter ?? { provide: QUEUE_ADAPTER, useClass: RedisQueueAdapter },
        );

        if (options.databaseAdapter) providers.push(options.databaseAdapter);

        return providers;
    }

    private static createAsyncProviders(options: NotificationModuleAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }

        if (options.useClass) {
            return [
                this.createAsyncOptionsProvider(options),
                {
                    provide: options.useClass,
                    useClass: options.useClass,
                },
            ];
        }

        return [];
    }

    private static createAsyncOptionsProvider(options: NotificationModuleAsyncOptions): Provider {
        if (options.useFactory) {
            return {
                provide: NOTIFICATION_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        if (options.useExisting) {
            return {
                provide: NOTIFICATION_MODULE_OPTIONS,
                useFactory: async (optionsFactory: NotificationOptionsFactory) =>
                    optionsFactory.createNotificationOptions(),
                inject: [options.useExisting],
            };
        }

        if (options.useClass) {
            return {
                provide: NOTIFICATION_MODULE_OPTIONS,
                useFactory: async (optionsFactory: NotificationOptionsFactory) =>
                    optionsFactory.createNotificationOptions(),
                inject: [options.useClass],
            };
        }

        throw new Error('Invalid async options configuration');
    }

    private static createChannelsFactory() {
        return (moduleOptions: NotificationModuleOptions) => {
            const builtInChannels = [MailChannel, DatabaseChannel, BroadcastChannel];
            const userChannels = moduleOptions.channels ?? [];
            return [...builtInChannels, ...userChannels];
        };
    }

    private static createAdapterFactory(
        optionKey: keyof NotificationModuleOptions,
        defaultClass: Type<unknown>,
    ) {
        return (moduleOptions: NotificationModuleOptions) => {
            const adapter = moduleOptions[optionKey];
            if (adapter) {
                if (typeof adapter === 'function') {
                    return new (adapter as Type<unknown>)();
                }
                return adapter;
            }
            return new defaultClass();
        };
    }

    /**
     * Lifecycle hook that is called when the module is initialized.
     * It checks the module options to determine if notifications should be automatically discovered.
     * If auto-discovery is enabled, it initiates the discovery process with the specified directories.
     *
     * @return {Promise<void>} A promise that resolves when the initialization process is complete.
     */
    async onModuleInit(): Promise<void> {
        if (this.moduleOptions.notificationTypes?.length) {
            for (const NotificationClass of this.moduleOptions.notificationTypes) {
                if (isSubclassOf(NotificationClass, BaseNotification)) {
                    const type = (NotificationClass as any).type ?? NotificationClass.name;
                    if (type) {
                        registerNotificationType(
                            type,
                            NotificationClass as new (...args: any[]) => BaseNotification,
                        );
                    }
                }
            }
        }

        if (this.moduleOptions.autoDiscoverNotifications ?? true) {
            await autoDiscoverNotifications({
                directories: this.moduleOptions.notificationAutoDiscoverDirectories ?? [
                    'dist',
                    'src',
                ],
            });
        }

        if (this.moduleOptions.worker?.enabled) {
            const timeout = this.moduleOptions.worker.blockTimeoutSeconds ?? 5;
            this.workerService.start(timeout).catch((err) => {
                this.logger.error(`Worker crashed: ${err.message}`);
            });
        }
    }
}
