/**
 * Shared guard for scripts that wipe collections (seed*, seed-json).
 * They delete data and some create accounts with well-known passwords
 * (admin@gema.com / admin123), so they must never touch a real database.
 */

const LOCAL_URI = /^mongodb:\/\/([^@/]+@)?(localhost|127\.0\.0\.1|mongo)(:\d+)?(\/|$)/;

// ponytail: a production DB reached through an SSH tunnel on localhost still
// looks local. Never tunnel prod to localhost while seeding.
export function isSafeSeedTarget(
  uri: string | undefined,
  nodeEnv: string | undefined,
  allowFlag: string | undefined,
): boolean {
  if (allowFlag === "yes") return true;
  return nodeEnv !== "production" && LOCAL_URI.test(uri || "");
}

export function assertSafeSeedTarget(uri: string | undefined): void {
  if (isSafeSeedTarget(uri, process.env.NODE_ENV, process.env.ALLOW_DESTRUCTIVE_SEED)) return;
  console.error(
    "Refusing to seed: NODE_ENV is production or MONGODB_URI is not a local database.\n" +
      "This script deletes data. Set ALLOW_DESTRUCTIVE_SEED=yes only if you are sure.",
  );
  process.exit(1);
}
