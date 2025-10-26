import { MailAdapter } from '../../interfaces/mail-adapter.interface';
import { MailMessage, RecipientLike } from '../../types';

export class MockMailAdapter implements MailAdapter {
    sent: { message: MailMessage; recipient: RecipientLike }[] = [];
    async sendMail(message: MailMessage, recipient: RecipientLike): Promise<void> {
        this.sent.push({ message, recipient });
    }
}

// Trivial test to ensure Jest does not fail on empty test suite
describe('MockMailAdapter helper', () => {
    it('noop', () => {
        expect(true).toBe(true);
    });
});
