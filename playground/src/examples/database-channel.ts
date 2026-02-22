/**
 * Example: Database Channel
 * ──────────────────────────────────────────────────────────────────────────
 * Sends a WelcomeNotification through the database channel using an
 * in-memory adapter that logs the stored record to the console.
 *
 * No external services required.
 *
 * How to run (from playground/):
 *   npx ts-node src/examples/database-channel.ts
 *   npm run example:database
 * ──────────────────────────────────────────────────────────────────────────
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NotificationManager } from '@voxcape/nestjs-notifications';
import { AppModule } from '../app.module';
import { WelcomeNotification } from '../notifications/welcome.notification';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const manager = app.get(NotificationManager);
    const user = { id: 1, email: 'demo@example.com', name: 'Demo User' };

    console.log('\n--- Sending WelcomeNotification via database channel ---');
    await manager.send(new WelcomeNotification(), user);
    console.log('--- Done ---\n');

    await app.close();
    process.exit(0);
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
