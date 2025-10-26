/**
 * Retrieves the value of an environment variable by its key. If the variable is not set,
 * it returns the provided fallback value, or undefined if no fallback is specified.
 *
 * @param key - The name of the environment variable.
 * @param fallback - An optional fallback value to return if the environment variable is not set.
 * @return The value of the environment variable, or the fallback value if the variable is not set.
 */
export function env<T = string>(key: string, fallback?: T): T {
    const value = process.env[key];
    return (value !== undefined ? (value as unknown as T) : fallback) as T;
}
