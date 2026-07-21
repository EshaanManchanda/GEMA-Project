import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import SystemSettings from "../../models/SystemSettings";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * One-time migration: populate the new canonical `whatsappNotifications`
 * field from the legacy `smsNotifications` field on the SystemSettings
 * singleton, so an admin's existing preference carries over under the new
 * name instead of silently resetting to the schema default (false).
 *
 * Safe to run more than once — it only touches documents where
 * `whatsappNotifications` is not yet set (undefined), so a value an admin
 * has already saved under the new field is never overwritten.
 *
 * `smsNotifications` is left in place after this runs; `settings.service.ts`
 * (`areWhatsappNotificationsEnabled`) still reads it as a fallback in case
 * this migration hasn't run yet in a given environment. Drop the old field
 * in a later cleanup once every environment has been migrated.
 *
 * Usage (from backend/):
 *   npx ts-node src/scripts/migrations/migrateSmsToWhatsappSetting.ts          # dry run (default)
 *   npx ts-node src/scripts/migrations/migrateSmsToWhatsappSetting.ts --apply  # actually write the value
 */

const APPLY = process.argv.includes("--apply");

async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
  await mongoose.connect(mongoUri);
  console.log(`✅  Connected to MongoDB (${APPLY ? "APPLY" : "DRY RUN"} mode)`);
}

async function migrate(): Promise<void> {
  const settings = await SystemSettings.getSettings();

  if (
    settings.whatsappNotifications !== undefined &&
    settings.whatsappNotifications !== null
  ) {
    console.log(
      `whatsappNotifications is already set (${settings.whatsappNotifications}) — nothing to do.`,
    );
    return;
  }

  const migratedValue = settings.smsNotifications === true;
  console.log(
    `Will set whatsappNotifications = ${migratedValue} (copied from smsNotifications).`,
  );

  if (!APPLY) {
    console.log(
      "Dry run — no changes written. Re-run with --apply to persist.",
    );
    return;
  }

  settings.whatsappNotifications = migratedValue;
  await settings.save();
  console.log("✅  whatsappNotifications migrated.");
}

async function main(): Promise<void> {
  try {
    await connectDatabase();
    await migrate();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
