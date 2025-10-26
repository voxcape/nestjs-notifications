import { ChannelName, MailMessage, DatabaseRecord, RecipientLike } from './types';

export interface Notification<R extends RecipientLike = RecipientLike> {
    /**
     * Retrieves a list of channel names associated with the given recipient.
     *
     * @param recipient - The recipient for whom the channels are being retrieved.
     * @return {ChannelName[]} An array of channel names associated with the recipient.
     */
    channels(recipient: R): ChannelName[];

    /**
     * Transforms the provided recipient into a mail message object, if applicable.
     *
     * @param recipient - The recipient information used to create the mail message.
     * @return {MailMessage | undefined} A MailMessage object if the transformation is successful, or undefined otherwise.
     */
    toMail?(recipient: R): MailMessage | undefined;

    /**
     * Converts the given recipient object to a database record format.
     *
     * @param recipient - The recipient object to be transformed into a database record.
     * @return {DatabaseRecord | undefined} A database record representation of the recipient,
     * or undefined if the conversion cannot be performed.
     */
    toDatabase?(recipient: R): DatabaseRecord | undefined;

    /**
     * Converts or prepares data to be sent to the specified recipient.
     *
     * @param recipient - The target recipient to which the data will be broadcast.
     * @return {any} The data formatted and ready for broadcasting to the recipient.
     */
    toBroadcast?(recipient: R): any;

    /**
     * Determines the broadcast channels or targets the given recipient should listen to.
     *
     * @param recipient - The recipient object that the broadcasting is intended for.
     * @return {string | string[]} A single channel or an array of channels that the recipient should listen on.
     */
    broadcastOn?(recipient: R): string | string[];

    /**
     * Determines whether a task or operation should be placed in a queue for delayed execution.
     *
     * @return {boolean} Returns true if the task should be queued, otherwise false.
     */
    shouldQueue(): boolean;
}
