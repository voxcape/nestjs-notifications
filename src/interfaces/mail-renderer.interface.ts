import { MailMessage, RecipientLike } from '../types';

export interface MailRenderer {
    /**
     * Renders a mail message for delivery.
     *
     * @param {MailMessage} message - The mail message object that contains the content to be rendered.
     * @param {RecipientLike} recipient - The recipient or recipient-like object for whom the message is being rendered.
     * @return {Promise<MailMessage>} A promise that resolves to the rendered MailMessage object.
     */
    render(message: MailMessage, recipient: RecipientLike): Promise<MailMessage>;
}
