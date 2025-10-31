import { Notification } from '../notification.interface';
import { RecipientLike } from '../types';

export interface QueueDequeueConfig {
    /**
     * Specifies the timeout duration for an operation or process in seconds.
     * If defined, this sets the maximum amount of time to wait before considering the operation as timed out.
     * Can be omitted to use a default value or indicate no timeout is applied.
     */
    blockTimeoutSeconds?: number;

    /**
     * Arbitrary adapter-specific properties.
     */
    [key: string]: any;
}

export interface QueueWorkerConfig extends QueueDequeueConfig {
    /**
     * An optional AbortSignal object that can be used to communicate with
     * or abort asynchronous operations. It allows the monitoring or cancellation
     * of an activity, such as fetch, event listeners, or other asynchronous tasks.
     */
    stopSignal?: AbortSignal;

    /**
     * Callback function that is triggered when an error occurs.
     *
     * This optional function allows for custom handling of errors.
     * It receives the error object as the first parameter and can optionally
     * receive additional job-related information as the second parameter.
     *
     * @param {Error} error - The error object describing the encountered issue.
     * @param {any} [job] - Optional parameter providing information about the job
     *                      or context in which the error occurred.
     */
    onError?: (error: Error, job?: any) => void;
    /**
     * A callback function that is invoked when a job starts.
     *
     * @param {any} job - Represents the job information or object related to the start event.
     */
    onStart?: (job: any) => void;
    /**
     * A callback function that is invoked upon the successful completion of a job.
     *
     * @type {(job: any) => void | undefined}
     * @param {any} job - The job object that contains details about the completed task.
     */
    onComplete?: (job: any) => void;
}

/**
 * Represents metadata for enqueueing an operation or task.
 *
 * This type can be used to specify information about retry attempts,
 * delays, and any other custom metadata when enqueueing items.
 *
 * Properties:
 * - `attempt` (optional): The current attempt number of the operation.
 * - `maxAttempts` (optional): The maximum number of retry attempts allowed.
 * - `delaySeconds` (optional): The delay in seconds before the next attempt.
 * - `[key: string]: any`: Allows additional custom properties to be set.
 */
export type EnqueueOptions = {
    attempt?: number;
    maxAttempts?: number;
    delaySeconds?: number;
    [key: string]: any;
}

export interface QueueAdapter {
    /**
     * Adds a notification to the queue for delivery to the specified recipient.
     *
     * @param {Notification} notification - The notification to be queued for delivery.
     * @param {RecipientLike} recipient - The recipient to whom the notification will be sent.
     * @param options
     * @return {Promise<void>} A promise that resolves when the notification is successfully queued.
     */
    enqueue(notification: Notification, recipient: RecipientLike, options?: EnqueueOptions): Promise<void>;

    /**
     * Removes and retrieves the next item from the queue based on the provided configuration.
     *
     * @param {QueueDequeueConfig} [config] - Optional configuration for the dequeue operation, which may include options like visibility timeout or wait time.
     * @return {Promise<any | null>} A promise that resolves to the next item in the queue, or null if the queue is empty.
     */
    dequeue?(config?: QueueDequeueConfig): Promise<any | null>;

    /**
     * Executes a worker function on queued jobs.
     *
     * @param {Function} processJob - A function that processes a single job.
     *                                It receives a job as an argument and is expected to return a Promise.
     * @param {QueueWorkerConfig} [config] - Optional configuration for the queue worker.
     * @return {Promise<void>} A promise that resolves when the worker is executed or completes processing.
     */
    work?(processJob: (job: any) => Promise<void>, config?: QueueWorkerConfig): Promise<void>;
}
