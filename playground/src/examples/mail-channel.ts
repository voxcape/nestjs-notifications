/**
 * Example: Mail Channel
 * ──────────────────────────────────────────────────────────────────────────
 * Sends a WelcomeNotification through the mail channel using the built-in
 * NodemailerMailAdapter.
 *
 * Required env vars — copy playground/.env.example to playground/.env and
 * fill in your SMTP credentials before running:
 *   MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM
 *
 * How to run (from playground/):
 *   cp .env.example .env   # then edit .env with real SMTP credentials
 *   npx ts-node src/examples/mail-channel.ts
 *   npm run example:mail
 * ──────────────────────────────────────────────────────────────────────────
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NotificationManager, BaseNotification, NotificationType } from '@voxcape/nestjs-notifications';
import { RecipientLike, MailMessage } from '@voxcape/nestjs-notifications';
import { AppModule } from '../app.module';

@NotificationType('welcome-mail')
class WelcomeMailNotification extends BaseNotification {
    public channels(_recipient: RecipientLike): string[] {
        return ['mail'];
    }

    public async toMail(recipient: RecipientLike): Promise<MailMessage> {
        return {
            to: recipient.email,
            subject: 'Welcome!',
            text: `Hello ${recipient.name ?? 'there'}, welcome to our platform.`,
            html: `<p>Hello <strong>${recipient.name ?? 'there'}</strong>, welcome to our platform.</p>`,
        };
    }
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const manager = app.get(NotificationManager);
    const user = { id: 1, email: 'demo@example.com', name: 'Demo User' };

    console.log('\n--- Sending WelcomeMailNotification via mail channel ---');
    await manager.send(new WelcomeMailNotification(), user);
    console.log('--- Done ---\n');

    await app.close();
    process.exit(0);
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
