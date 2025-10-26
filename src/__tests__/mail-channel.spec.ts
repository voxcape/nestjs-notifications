import { MailChannel } from '../channels/mail.channel';
import { MailAdapter } from '../interfaces/mail-adapter.interface';
import { MailMessage, RecipientLike } from '../types';

class MockMailAdapter implements MailAdapter {
    sent: { message: MailMessage; recipient: RecipientLike }[] = [];
    async sendMail(message: MailMessage, recipient: RecipientLike): Promise<void> {
        this.sent.push({ message, recipient });
    }
}

describe('MailChannel', () => {
    it('sends mail via adapter', async () => {
        const adapter = new MockMailAdapter();
        const channel = new MailChannel(adapter as any);

        const notif = {
            toMail: () => ({ subject: 'Hi', text: 'Hello World' }),
        };

        await channel.send(notif as any, { email: 'test@example.com' });

        expect(adapter.sent.length).toBe(1);
        expect(adapter.sent[0].message.subject).toBe('Hi');
        expect(adapter.sent[0].recipient.email).toBe('test@example.com');
    });
});
