import { Notification } from './notification.interface';

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
