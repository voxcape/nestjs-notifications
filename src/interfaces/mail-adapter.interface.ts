import { MailMessage, RecipientLike } from '../types';

export interface MailAdapter {
    /**
     * Sends an email to the specified recipient with the given message.
     *
     * @param {MailMessage} message - The email message to be sent, containing details such as subject, body, and attachments.
     * @param {RecipientLike} recipient - The recipient of the email. Can include email address or recipient details.
     * @return {Promise<void>} A promise that resolves when the email is successfully sent, or rejects if there is an error.
     */
    sendMail(message: MailMessage, recipient: RecipientLike): Promise<void>;
}
