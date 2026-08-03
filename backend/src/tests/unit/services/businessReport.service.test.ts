/**
 * businessReport.service.ts — confidentiality boundary tests.
 *
 * The most important assertion in this file: toReportPayload() must strip
 * notes.internal and the auditTrail from every snapshot before it can reach
 * any render/export path (PDF, CSV, or future formats). This is enforced at
 * the serializer, not the template, so every caller benefits automatically.
 */

import mongoose from "mongoose";
import {
  toReportPayload,
  reportPayloadToCsv,
} from "../../../services/businessReport.service";
import { IVendorBusinessSnapshot } from "../../../models/VendorBusinessSnapshot";
import { IVendor } from "../../../models/Vendor";

function makeSnapshot(
  overrides: Partial<IVendorBusinessSnapshot> = {},
): IVendorBusinessSnapshot {
  return {
    vendorId: new mongoose.Types.ObjectId(),
    period: "2026-07",
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    periodEnd: new Date("2026-07-31T23:59:59.999Z"),
    scores: {
      overall: 80,
      listing: 90,
      sales: 70,
      marketing: null,
      customer: 85,
      operations: 75,
    },
    profileCompletion: { percent: 60, items: [] },
    confidence: { level: "medium", dimensionsScored: 4, dimensionsTotal: 5 },
    metrics: [
      {
        key: "totalRevenue",
        label: "Revenue",
        value: 5000,
        unit: "AED",
        source: "auto",
      },
    ],
    recommendations: [],
    tasks: [],
    notes: {
      vendorVisible: "Great quarter overall — keep up the Instagram Reels.",
      internal: "Potential premium customer; slow to respond to emails.",
    },
    status: "draft",
    rulesetVersion: "1.0",
    reportVersion: "1.0",
    auditTrail: [
      {
        action: "created",
        actorId: new mongoose.Types.ObjectId(),
        at: new Date("2026-07-01T00:00:00.000Z"),
      },
    ],
    generatedAt: new Date("2026-07-31T12:00:00.000Z"),
    generatedBy: "manual",
    ...overrides,
  } as IVendorBusinessSnapshot;
}

const VENDOR: Pick<
  IVendor,
  | "businessName"
  | "logo"
  | "coverImage"
  | "description"
  | "website"
  | "socialMedia"
  | "verificationStatus"
  | "createdAt"
  | "stats"
> = {
  businessName: "Ascend Esports",
  logo: "https://cdn.example.com/logo.png",
  coverImage: undefined,
  description: "Gaming events for kids",
  website: "https://ascend.example.com",
  socialMedia: { instagram: "https://instagram.com/ascend" },
  verificationStatus: "verified" as IVendor["verificationStatus"],
  createdAt: new Date("2025-01-15T00:00:00.000Z"),
  stats: {
    totalEvents: 12,
    totalBookings: 340,
    totalRevenue: 58000,
    averageRating: 4.6,
    totalReviews: 87,
    lastCalculatedAt: new Date("2026-07-31T00:00:00.000Z"),
  },
};

describe("toReportPayload (confidentiality boundary)", () => {
  it("includes vendor-visible notes", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(payload.vendorVisibleNotes).toBe(
      "Great quarter overall — keep up the Instagram Reels.",
    );
  });

  it("never includes internal notes in the payload", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(JSON.stringify(payload)).not.toContain("premium customer");
    expect((payload as any).notes).toBeUndefined();
  });

  it("never includes the audit trail in the payload", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect((payload as any).auditTrail).toBeUndefined();
  });

  it("carries forward the ruleset and report version for the footer", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(payload.rulesetVersion).toBe("1.0");
    expect(payload.reportVersion).toBe("1.0");
  });

  it("infers schemaVersion 1 (legacy) for a snapshot with no schemaVersion field, never fabricating the current version", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(payload.schemaVersion).toBe(1);
  });

  it("passes through an explicit schemaVersion rather than overriding it", () => {
    const payload = toReportPayload(makeSnapshot({ schemaVersion: 2 }), VENDOR);
    expect(payload.schemaVersion).toBe(2);
  });

  it("stamps the current render-time template version, which is never read off the snapshot doc", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(payload.templateVersion).toBe("1.0");
  });

  it("preserves null (Not tracked) dimension scores rather than coercing to 0", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(payload.scores.marketing).toBeNull();
  });

  it("passes frozen benchmarks through to the payload", () => {
    const capturedAt = new Date("2026-07-31T00:00:00.000Z");
    const payload = toReportPayload(
      makeSnapshot({
        benchmarks: { averageListingPhotoCount: 12.5, capturedAt },
      }),
      VENDOR,
    );
    expect(payload.benchmarks).toEqual({
      averageListingPhotoCount: 12.5,
      capturedAt,
    });
  });

  it("leaves benchmarks undefined for a legacy snapshot rather than fabricating a value", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    expect(payload.benchmarks).toBeUndefined();
  });
});

describe("reportPayloadToCsv (confidentiality boundary)", () => {
  it("never includes internal notes in the CSV body", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    const csv = reportPayloadToCsv(payload);
    expect(csv).not.toContain("premium customer");
  });

  it("renders null scores as 'Not tracked', never as 0", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    const csv = reportPayloadToCsv(payload);
    expect(csv).toContain("Not tracked");
  });

  it("includes vendor-visible notes when present", () => {
    const payload = toReportPayload(makeSnapshot(), VENDOR);
    const csv = reportPayloadToCsv(payload);
    expect(csv).toContain("Instagram Reels");
  });
});
