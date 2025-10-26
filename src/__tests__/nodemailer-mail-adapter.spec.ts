import { Logger } from '@nestjs/common';
import { NodemailerMailAdapter } from '../adapters/nodemailer-mail.adapter';
import { MailRenderer } from '../interfaces/mail-renderer.interface';

jest.mock('nodemailer', () => {
    const sendMailMock = jest.fn();
    const createTransportMock = jest.fn().mockImplementation(() => ({
        sendMail: sendMailMock,
    }));

    return {
        __esModule: true,
        default: {
            createTransport: createTransportMock,
        },
        createTransport: createTransportMock,
        __mocked: {
            sendMailMock,
            createTransportMock,
        },
    };
});

const nodemailerMock = jest.requireMock('nodemailer') as {
    createTransport: jest.Mock;
    __mocked: {
        sendMailMock: jest.Mock;
        createTransportMock: jest.Mock;
    };
};

const createTransportMock = nodemailerMock.createTransport;
const sendMailMock = nodemailerMock.__mocked.sendMailMock;

const loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

const envKeys = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM'];
const originalEnvSnapshot: Record<string, string | undefined> = {};

envKeys.forEach((key) => {
    originalEnvSnapshot[key] = process.env[key];
});

function resetEnv(): void {
    envKeys.forEach((key) => delete process.env[key]);
}

beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue(undefined);
    createTransportMock.mockClear();
    loggerLogSpy.mockClear();
    loggerErrorSpy.mockClear();
    resetEnv();
});

afterAll(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    Object.entries(originalEnvSnapshot).forEach(([key, value]) => {
        if (value === undefined) {
            delete process.env[key];
            return;
        }
        process.env[key] = value;
    });
});

describe('NodemailerMailAdapter', () => {
    it('creates transporter using environment configuration', () => {
        process.env.MAIL_HOST = 'smtp.example.com';
        process.env.MAIL_PORT = '465';
        process.env.MAIL_USERNAME = 'mailer';
        process.env.MAIL_PASSWORD = 'secret';

        new NodemailerMailAdapter();

        expect(createTransportMock).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            auth: {
                user: 'mailer',
                pass: 'secret',
            },
        });
    });

    it('renders message with renderer before sending', async () => {
        process.env.MAIL_FROM = 'Notifications <notify@example.com>';
        const renderer: MailRenderer = {
            render: jest.fn().mockResolvedValue({
                subject: 'Rendered subject',
                text: 'Rendered text',
                html: '<p>Rendered</p>',
                headers: { 'X-Test': '1' },
            }),
        };
        const adapter = new NodemailerMailAdapter(renderer);

        const message = {
            subject: 'Original subject',
            text: 'Original text',
            html: '<p>Original</p>',
            headers: { 'X-Test': '0' },
        };
        const recipient = { email: 'user@example.com' };

        await adapter.sendMail(message, recipient);

        expect(renderer.render).toHaveBeenCalledWith(message, recipient);
        expect(sendMailMock).toHaveBeenCalledWith({
            from: 'Notifications <notify@example.com>',
            to: 'user@example.com',
            subject: 'Rendered subject',
            text: 'Rendered text',
            html: '<p>Rendered</p>',
            headers: { 'X-Test': '1' },
        });
        expect(loggerLogSpy).toHaveBeenCalledWith('Mail sent to user@example.com');
    });

    it('uses message defaults when renderer is not provided', async () => {
        const adapter = new NodemailerMailAdapter();
        const message = {
            to: 'fallback@example.com',
            text: 'Hello world',
        };
        const recipient = {};

        await adapter.sendMail(message, recipient);

        expect(sendMailMock).toHaveBeenCalledWith({
            from: '"App" <no-reply@app.com>',
            to: 'fallback@example.com',
            subject: '[No subject]',
            text: 'Hello world',
            html: '<p>Hello world</p>',
            headers: {},
        });
    });

    it('logs and rethrows errors from transporter', async () => {
        const adapter = new NodemailerMailAdapter();
        const error = new Error('SMTP failure');
        sendMailMock.mockRejectedValueOnce(error);

        await expect(
            adapter.sendMail({ text: 'Hello' }, { email: 'user@example.com' }),
        ).rejects.toThrow('SMTP failure');

        expect(loggerErrorSpy).toHaveBeenCalledWith(
            'Failed to send mail to user@example.com: SMTP failure',
        );
    });
});
