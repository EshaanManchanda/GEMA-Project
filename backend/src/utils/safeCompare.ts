import { timingSafeEqual } from "crypto";

/**
 * Constant-time string equality for secrets and tokens that never throws.
 *
 * crypto.timingSafeEqual throws a RangeError when the BYTE lengths differ.
 * Comparing `.length` first is not enough: a multi-byte character (é, 日, an
 * emoji) makes two strings the same length in characters but not in bytes, so
 * attacker-supplied input could crash the check. In an async Express 4 handler
 * that is an unhandled rejection, and server.ts exits the process on those.
 *
 * Empty strings and non-strings never match, so an unset secret cannot be
 * "matched" by an empty value.
 */
export function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
