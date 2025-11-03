/**
 * @voxcape/nestjs-notifications
 * --------------------------------------------
 * Author: Bolaji (Voxcape)
 * Repository: https://github.com/voxcape/nestjs-notifications
 * License: MIT
 *
 * A lightweight, extensible Laravel-style notifications system for NestJS.
 * Supports mail, database, broadcast, and queued notifications.
 *
 * Features:
 * - Plug-and-play adapters (Mail, Redis Queue, Broadcast)
 * - Queueable notifications via ShouldQueue interface
 * - Real-time broadcasting
 * - Extendable with custom adapters (e.g. Pusher, Ably)
 *
 * © Voxcape 2025, maintained by Bolaji and the Voxcape team.
 */

export * from './constants';
export * from './types';
export * from './notification.interface';
export * from './notification.manager';
export * from './notification.module';
export * from './base-notification';
export * from './decorators/notification-type.decorator';
export * from './notification.serializer';
export * from './notification-type-loader';

export * from './interfaces/mail-adapter.interface';
export * from './interfaces/database-adapter.interface';
export * from './interfaces/broadcast-adapter.interface';
export * from './interfaces/queue-adapter.interface';
export * from './interfaces/channel.interface';

export * from './adapters/nodemailer-mail.adapter';
export * from './adapters/redis-broadcast.adapter';
export * from './adapters/redis-queue.adapter';

export * from './channels/mail.channel';
export * from './channels/database.channel';
export * from './channels/broadcast.channel';

export * from './commands/notification-worker.command';

export * from './utils/ensure-array';
export * from './utils/env';
