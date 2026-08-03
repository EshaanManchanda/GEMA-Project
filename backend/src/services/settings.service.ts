import SystemSettings, { ISystemSettings } from "../models/SystemSettings";
import { cacheService } from "./cache.service";
import logger from "../config/logger";

/**
 * Single source of truth for reading admin-configurable system settings
 * (maintenance mode, auto-approval toggles, notification toggles, etc).
 *
 * Business logic must go through this service instead of calling
 * `SystemSettings.getSettings()` directly, so every read benefits from the
 * same cache and the same fallback/migration rules (e.g. WhatsApp).
 */

const CACHE_KEY = "system_settings:singleton";
const CACHE_TTL_SECONDS = 60;

let inMemoryFallback: ISystemSettings | null = null;

/**
 * Fetch the singleton settings document, preferring the cache.
 * Falls back to the last known value in-process if both cache and DB
 * are momentarily unavailable, so a Redis/Mongo blip never turns into a
 * false "maintenance mode is off" / "registration is disabled" read.
 */
export async function getSystemSettings(): Promise<ISystemSettings> {
  const cached = await cacheService.get<ISystemSettings>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const settings = await SystemSettings.getSettings();
    inMemoryFallback = settings;
    // Cache a plain object snapshot; Mongoose documents don't round-trip
    // cleanly through JSON.stringify/parse for our purposes here anyway.
    await cacheService.set(CACHE_KEY, settings.toObject(), {
      ttl: CACHE_TTL_SECONDS,
    });
    return settings;
  } catch (error) {
    logger.error(
      `settings.service: failed to load SystemSettings, using fallback: ${(error as Error).message}`,
    );
    if (inMemoryFallback) {
      return inMemoryFallback;
    }
    throw error;
  }
}

/**
 * Must be called after any successful settings update so subsequent reads
 * (on this instance and, via Redis, on every other instance) see the new
 * value immediately instead of waiting out the TTL.
 */
export async function invalidateSettingsCache(): Promise<void> {
  await cacheService.delete(CACHE_KEY);
  inMemoryFallback = null;
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.maintenanceMode === true;
}

export async function isRegistrationAllowed(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.allowRegistration !== false;
}

export async function shouldAutoApproveEvents(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.autoApproveEvents === true;
}

export async function shouldAutoApproveVendors(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.autoApproveVendors === true;
}

export async function shouldAutoApproveReviews(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.autoApproveReviews === true;
}

export async function areEmailNotificationsEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.emailNotifications !== false;
}

/**
 * Reads the new canonical `whatsappNotifications` field, falling back to
 * the legacy `smsNotifications` field until the migration has run / for any
 * document created before the rename. See scripts/migrations for the
 * one-time data migration that populates `whatsappNotifications`.
 */
export async function areWhatsappNotificationsEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  const value = settings.whatsappNotifications ?? settings.smsNotifications;
  return value === true;
}

/**
 * App-wide kill switch for the Business Optimization / Report Center (KBOS).
 * Only gates the vendor-facing surface — admin access to business reports is
 * never gated by this flag.
 */
export async function areBusinessReportsEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.businessReportsEnabled !== false;
}

export default {
  getSystemSettings,
  invalidateSettingsCache,
  isMaintenanceMode,
  isRegistrationAllowed,
  shouldAutoApproveEvents,
  shouldAutoApproveVendors,
  shouldAutoApproveReviews,
  areEmailNotificationsEnabled,
  areWhatsappNotificationsEnabled,
  areBusinessReportsEnabled,
};
