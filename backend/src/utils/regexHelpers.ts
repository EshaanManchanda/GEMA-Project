/**
 * Escape special regex characters in a user-supplied string.
 * Prevents malformed-regex errors when building dynamic RegExp from input.
 *
 * @example
 *   new RegExp(escapeRegex(userInput), 'i')
 */
export const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
