import { Notification } from './notification.interface';
import { Provider, Type, ModuleMetadata } from '@nestjs/common';

export type ChannelName = string;

export interface RecipientLike {
    id?: string | number;
    email?: string;
    [k: string]: any;
}

export interface MailMessage {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    /**
     * Allow adapter-specific or template-specific fields.
     * Examples:
     * - template_id (SendGrid)
     * - templateAlias (Postmark)
     * - dynamicTemplateData, substitutions, etc.
     */
    [key: string]: any;
}

export interface DatabaseRecord {
    userId: string | number;
    type: string;
    title?: string;
    body?: string;
    meta?: Record<string, any>;
    readAt?: Date | null;
    createdAt?: Date;
}

export type SerializedNotification = {
    notification: string;
    data: Notification;
    recipient: RecipientLike;
    timestamp: number;
};

export interface NotificationWorkerConfig {
    /**
     * Enables or disables the background worker for processing notifications.
     * When true, the worker starts automatically on module initialization.
     */
    enabled?: boolean;

    /**
     * Optional block timeout in seconds for dequeue operations.
     * Defaults to 5 seconds if not specified.
     */
    blockTimeoutSeconds?: number;
}

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
