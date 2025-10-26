export interface BroadcastAdapter {
    /**
     * Publishes a message to the specified channel with the given payload.
     *
     * @param {string} channel - The name of the channel to publish to.
     * @param {any} payload - The data to be sent to the specified channel.
     * @return {Promise<void>} A promise that resolves when the message is successfully published.
     */
    publish(channel: string, payload: any): Promise<void>;
}
