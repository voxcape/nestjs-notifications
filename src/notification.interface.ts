import { ChannelName, MailMessage, DatabaseRecord, RecipientLike } from './types';

export interface Notification<R extends RecipientLike = RecipientLike> {
    /**
     * The maximum number of retry attempts allowed for a specific operation or process.
     * This value determines how many times the system will attempt to retry before failing.
     * If not specified, the default behavior is implementation-defined.
     * A value of `0` typically indicates that no retries should occur, and a value greater than `0` specifies the permitted number of retries.
     */
    retryLimit?: number;

    /**
     * An optional variable that specifies a delay duration in seconds.
     * Can be used to define how long a delay should last, typically in asynchronous operations or time-based logic.
     * If not provided, delaySeconds is undefined and no delay will be applied.
     */
    delaySeconds?: number;

    /**
     * Determines whether a retry should be attempted based on the provided error and the number of attempts made.
     *
     * @param {Error} error - The error encountered during the operation.
     * @param {number} attempt - The number of retry attempts already made.
     * @return {boolean} Returns true if the operation should be retried, otherwise false.
     */
    shouldRetry?(error: Error, attempt: number): boolean;

    /**
     * Provides a mechanism to calculate the delay time before retrying an operation, typically after a failure.
     *
     * @param {number} attempt - The current retry attempt number, starting from 1.
     * @param {Error} error - The error object associated with the failure of the previous attempt.
     * @return {number} The calculated delay time in milliseconds before the next retry attempt.
     */
    backoff?(attempt: number, error: Error): number;
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
     * @return Promise<{MailMessage | undefined}> - A MailMessage object if the transformation is successful, or undefined otherwise.
     */
    toMail?(recipient: R): Promise<MailMessage | undefined>;

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
