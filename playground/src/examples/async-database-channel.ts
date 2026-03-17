/**
 * Example: Async Module Configuration + Database Channel
 * ──────────────────────────────────────────────────────────────────────────
 * Same as the database-channel example, but uses NotificationModule.forRootAsync()
 * to configure the module. This is the pattern you'd use when adapter settings
 * come from ConfigService, environment variables, or any async source.
 *
 * No external services required.
 *
 * How to run (from playground/):
 *   npx ts-node src/examples/async-database-channel.ts
 *   npm run example:async-database
 * ──────────────────────────────────────────────────────────────────────────
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NotificationManager } from '@voxcape/nestjs-notifications';
import { AppAsyncModule } from '../app-async.module';
import { WelcomeNotification } from '../notifications/welcome.notification';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppAsyncModule, {
        logger: ['error', 'warn', 'log'],
    });

    const manager = app.get(NotificationManager);
    const user = { id: 1, email: 'demo@example.com', name: 'Demo User' };

    console.log('\n--- Sending WelcomeNotification via database channel (async config) ---');
    await manager.send(new WelcomeNotification(), user);
    console.log('--- Done ---\n');

    await app.close();
    process.exit(0);
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
