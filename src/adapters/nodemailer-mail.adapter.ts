import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { MailAdapter } from '../interfaces/mail-adapter.interface';
import { MAIL_RENDERER } from '../constants';
import { MailRenderer } from '../interfaces/mail-renderer.interface';
import { MailMessage, RecipientLike } from '../types';
import { env } from '../utils/env';

@Injectable()
export class NodemailerMailAdapter implements MailAdapter {
    private readonly logger = new Logger(NodemailerMailAdapter.name);
    private transporter: Transporter;

    constructor(@Optional() @Inject(MAIL_RENDERER) private readonly renderer?: MailRenderer) {
        this.transporter = nodemailer.createTransport({
            host: env('MAIL_HOST'),
            port: Number(env('MAIL_PORT', 587)),
            secure: Number(env('MAIL_PORT', 587)) === 465,
            auth: {
                user: env('MAIL_USERNAME'),
                pass: env('MAIL_PASSWORD'),
            },
        });
    }

    /**
     * @inheritDoc
     */
    async sendMail(message: MailMessage, recipient: RecipientLike): Promise<void> {
        let mail = message;

        if (this.renderer) {
            mail = await this.renderer.render(message, recipient);
        }

        const mailOptions = {
            from: env('MAIL_FROM', '"App" <no-reply@app.com>'),
            to: recipient.email ?? mail.to,
            subject: mail.subject ?? '[No subject]',
            text: mail.text,
            html: mail.html ?? `<p>${mail.text ?? ''}</p>`,
            headers: mail.headers ?? {},
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Mail sent to ${mailOptions.to}`);
        } catch (error) {
            this.logger.error(
                `Failed to send mail to ${mailOptions.to}: ${(error as Error).message}`,
            );
            throw error;
        }
    }
}
