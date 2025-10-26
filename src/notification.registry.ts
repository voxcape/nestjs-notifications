import { BaseNotification } from './base-notification';

/**
 * A registry map used to store notification types.
 *
 * This map associates a string key with a constructor function for notification classes
 * that extend the `BaseNotification` class. It allows dynamic creation of notification instances
 * by looking them up via their string key and invoking the associated constructor.
 *
 * Key:
 *   A string identifier representing the notification type.
 *
 * Value:
 *   A constructor function that creates instances of classes extending `BaseNotification`.
 */
const registry = new Map<string, new (...args: any[]) => BaseNotification>();

/**
 * Registers a notification type with the specified constructor in the notification registry.
 *
 * @param {string} type - The unique string identifier for the notification type.
 * @param {new (...args: any[]) => BaseNotification} ctor - The constructor function for the notification type.
 * @return {void} This method does not return a value.
 */
export function registerNotificationType(
    type: string,
    ctor: new (...args: any[]) => BaseNotification,
): void {
    registry.set(type, ctor);
}

/**
 * Retrieves the constructor for a notification type.
 *
 * @param {string} type - The type of notification to retrieve the constructor for.
 * @return {{ new(...args: any[]): BaseNotification } | undefined} The notification constructor if it exists, or undefined if not found.
 */
export function getNotificationConstructor(
    type: string,
): { new (...args: any[]): BaseNotification } | undefined {
    return registry.get(type);
}

/**
 * Retrieves all the registered types from the registry.
 *
 * @return {string[]} An array containing the names of all registered types.
 */
export function getRegisteredTypes(): string[] {
    return [...registry.keys()];
}

/**
 * Clears all entries from the notification registry.
 *
 * @return {void} This method does not return a value.
 */
export function clearNotificationRegistry(): void {
    registry.clear();
}
