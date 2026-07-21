/**
 * Unit tests for settings.service.ts — the cached single source of truth
 * business logic reads instead of calling SystemSettings.getSettings()
 * directly. Covers: cache hit/miss, invalidation, each boolean accessor,
 * and the WhatsApp/SMS fallback used during the field-rename migration.
 */

import SystemSettings from "../../../models/SystemSettings";
import { cacheService } from "../../../services/cache.service";

jest.mock("../../../models/SystemSettings", () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn(),
  },
}));
jest.mock("../../../services/cache.service", () => ({
  __esModule: true,
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../../../config/logger");

const mockedGet = cacheService.get as jest.Mock;
const mockedSet = cacheService.set as jest.Mock;
const mockedDelete = cacheService.delete as jest.Mock;
const mockedGetSettings = SystemSettings.getSettings as jest.Mock;

// Imported after mocks so the module under test picks up the mocked deps.
import * as settingsService from "../../../services/settings.service";

function fakeSettingsDoc(overrides: Record<string, unknown> = {}) {
  const doc = {
    maintenanceMode: false,
    allowRegistration: true,
    autoApproveEvents: false,
    autoApproveVendors: false,
    autoApproveReviews: false,
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: undefined,
    pushNotifications: false,
    ...overrides,
  };
  return { ...doc, toObject: () => doc };
}

describe("settings.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue(null); // cache miss by default
    mockedSet.mockResolvedValue(true);
    mockedDelete.mockResolvedValue(true);
  });

  describe("getSystemSettings / caching", () => {
    it("returns the cached value without hitting the DB on a cache hit", async () => {
      mockedGet.mockResolvedValue(fakeSettingsDoc({ maintenanceMode: true }));

      const result = await settingsService.getSystemSettings();

      expect(result.maintenanceMode).toBe(true);
      expect(mockedGetSettings).not.toHaveBeenCalled();
    });

    it("falls back to the DB and populates the cache on a miss", async () => {
      mockedGetSettings.mockResolvedValue(fakeSettingsDoc({ maintenanceMode: true }));

      const result = await settingsService.getSystemSettings();

      expect(result.maintenanceMode).toBe(true);
      expect(mockedGetSettings).toHaveBeenCalledTimes(1);
      expect(mockedSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ maintenanceMode: true }),
        expect.objectContaining({ ttl: expect.any(Number) }),
      );
    });

    it("busts the cache on invalidateSettingsCache()", async () => {
      await settingsService.invalidateSettingsCache();
      expect(mockedDelete).toHaveBeenCalled();
    });

    it("serves the last known value in-process if both cache and DB fail after a prior successful read", async () => {
      mockedGetSettings.mockResolvedValueOnce(fakeSettingsDoc({ maintenanceMode: false }));
      await settingsService.getSystemSettings(); // warms inMemoryFallback

      mockedGet.mockResolvedValue(null);
      mockedGetSettings.mockRejectedValueOnce(new Error("Mongo down"));

      const result = await settingsService.getSystemSettings();
      expect(result.maintenanceMode).toBe(false);
    });
  });

  describe("boolean accessors", () => {
    it("isMaintenanceMode() reflects the stored value", async () => {
      mockedGetSettings.mockResolvedValue(fakeSettingsDoc({ maintenanceMode: true }));
      expect(await settingsService.isMaintenanceMode()).toBe(true);
    });

    it("isRegistrationAllowed() defaults true unless explicitly false", async () => {
      mockedGetSettings.mockResolvedValue(fakeSettingsDoc({ allowRegistration: false }));
      expect(await settingsService.isRegistrationAllowed()).toBe(false);
    });

    it("shouldAutoApproveEvents()/Vendors()/Reviews() read their own fields", async () => {
      mockedGetSettings.mockResolvedValue(
        fakeSettingsDoc({
          autoApproveEvents: true,
          autoApproveVendors: false,
          autoApproveReviews: true,
        }),
      );
      expect(await settingsService.shouldAutoApproveEvents()).toBe(true);
      expect(await settingsService.shouldAutoApproveVendors()).toBe(false);
      expect(await settingsService.shouldAutoApproveReviews()).toBe(true);
    });

    it("areEmailNotificationsEnabled() defaults true unless explicitly false", async () => {
      mockedGetSettings.mockResolvedValue(fakeSettingsDoc({ emailNotifications: false }));
      expect(await settingsService.areEmailNotificationsEnabled()).toBe(false);
    });
  });

  describe("areWhatsappNotificationsEnabled() — migration fallback", () => {
    it("reads the new whatsappNotifications field when set", async () => {
      mockedGetSettings.mockResolvedValue(
        fakeSettingsDoc({ whatsappNotifications: true, smsNotifications: false }),
      );
      expect(await settingsService.areWhatsappNotificationsEnabled()).toBe(true);
    });

    it("falls back to the legacy smsNotifications field when whatsappNotifications is undefined", async () => {
      mockedGetSettings.mockResolvedValue(
        fakeSettingsDoc({ whatsappNotifications: undefined, smsNotifications: true }),
      );
      expect(await settingsService.areWhatsappNotificationsEnabled()).toBe(true);
    });

    it("defaults to false when neither field is set", async () => {
      mockedGetSettings.mockResolvedValue(
        fakeSettingsDoc({ whatsappNotifications: undefined, smsNotifications: undefined }),
      );
      expect(await settingsService.areWhatsappNotificationsEnabled()).toBe(false);
    });
  });
});
