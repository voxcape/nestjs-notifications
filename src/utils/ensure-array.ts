/**
 * Ensures that the given input is always returned as an array.
 *
 * @param input - The input value that can be an item, an array of items, undefined, or null.
 * @return Returns an array. If the input is null or undefined, returns an empty array. If the input is not an array, wraps it in an array.
 */
export function ensureArray<T>(input: T | T[] | undefined | null): T[] {
    if (!input) return [];
    return Array.isArray(input) ? input : [input];
}
