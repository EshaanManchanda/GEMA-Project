/**
 * Roles that can be assigned via Google / Firebase sign-up.
 * Used by both the validator and the controller — single source of truth.
 */
export const GOOGLE_ALLOWED_ROLES = ["customer", "vendor", "teacher"] as const;
export type GoogleAllowedRole = (typeof GOOGLE_ALLOWED_ROLES)[number];
