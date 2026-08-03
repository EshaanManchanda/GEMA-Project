import mongoose from "mongoose";
import {
  canonicalize,
  buildSealedContent,
  computeSnapshotHash,
  verifySnapshotHash,
  SealedContentSource,
} from "../../../services/snapshotIntegrity.service";
import { ISnapshotIntegrity } from "../../../models/VendorBusinessSnapshot";

const SECRET = "unit-test-secret";

function baseSource(
  overrides: Partial<SealedContentSource> = {},
): SealedContentSource {
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
      { key: "totalRevenue", label: "Revenue", value: 5000, source: "auto" },
    ],
    recommendations: [],
    rulesetVersion: "1.0",
    reportVersion: "1.0",
    schemaVersion: 2,
    generatedAt: new Date("2026-07-31T12:00:00.000Z"),
    generatedBy: "manual",
    tasks: [],
    ...overrides,
  } as SealedContentSource;
}

describe("canonicalize", () => {
  it("produces the same string regardless of object key insertion order", () => {
    const a = canonicalize({ b: 1, a: 2, c: 3 });
    const b = canonicalize({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it("produces the same string for a Date and its ISO string", () => {
    const iso = "2026-07-31T12:00:00.000Z";
    const a = canonicalize(new Date(iso));
    const b = canonicalize(iso);
    expect(a).toBe(b);
  });

  it("treats an absent-optional key and an explicit undefined value identically", () => {
    const a = canonicalize({ x: 1 });
    const b = canonicalize({ x: 1, y: undefined });
    expect(a).toBe(b);
  });

  it("treats null and undefined as distinct", () => {
    const withNull = canonicalize({ x: null });
    const withoutKey = canonicalize({});
    expect(withNull).not.toBe(withoutKey);
  });

  it("does not sort arrays", () => {
    const a = canonicalize([1, 2, 3]);
    const b = canonicalize([3, 2, 1]);
    expect(a).not.toBe(b);
  });
});

describe("computeSnapshotHash", () => {
  it("changes when a score changes", () => {
    const sealedA = buildSealedContent(baseSource());
    const sealedB = buildSealedContent(
      baseSource({
        scores: {
          overall: 81,
          listing: 90,
          sales: 70,
          marketing: null,
          customer: 85,
          operations: 75,
        },
      }),
    );
    expect(computeSnapshotHash(sealedA, SECRET)).not.toBe(
      computeSnapshotHash(sealedB, SECRET),
    );
  });

  it("does not change when a task's done/completedAt/completedBy changes — only code/label are sealed", () => {
    const vendorId = new mongoose.Types.ObjectId();
    const taskA = {
      code: "ADD_PHOTOS",
      label: "Add photos",
      done: false,
    };
    const taskB = {
      code: "ADD_PHOTOS",
      label: "Add photos",
      done: true,
      completedAt: new Date(),
      completedBy: new mongoose.Types.ObjectId(),
    };
    const sealedA = buildSealedContent(
      baseSource({ vendorId, tasks: [taskA] }),
    );
    const sealedB = buildSealedContent(
      baseSource({ vendorId, tasks: [taskB] }),
    );
    expect(computeSnapshotHash(sealedA, SECRET)).toBe(
      computeSnapshotHash(sealedB, SECRET),
    );
  });

  it("is deterministic — the same source produces the same hash every time", () => {
    // buildSealedContent's input type has no notes/status/auditTrail fields
    // at all, so a legitimate post-generation edit to any of those (which
    // is exactly what happens when notes are edited, a snapshot is locked,
    // or an audit entry is appended) can never change the hash — enforced
    // at compile time by SealedContentSource simply not exposing them.
    const vendorId = new mongoose.Types.ObjectId();
    const generatedAt = new Date("2026-07-31T12:00:00.000Z");
    const sealedA = buildSealedContent(baseSource({ vendorId, generatedAt }));
    const sealedB = buildSealedContent(baseSource({ vendorId, generatedAt }));
    expect(computeSnapshotHash(sealedA, SECRET)).toBe(
      computeSnapshotHash(sealedB, SECRET),
    );
  });

  it("changes when array order changes (recommendations are severity-ordered, not sorted at hash time)", () => {
    const recA = [
      {
        code: "A",
        title: "A",
        severity: "high" as const,
        currentValue: "1",
        targetValue: "2",
        reason: "r",
        estimatedImpact: "high" as const,
      },
      {
        code: "B",
        title: "B",
        severity: "low" as const,
        currentValue: "1",
        targetValue: "2",
        reason: "r",
        estimatedImpact: "low" as const,
      },
    ];
    const recB = [recA[1], recA[0]];
    const sealedA = buildSealedContent(baseSource({ recommendations: recA }));
    const sealedB = buildSealedContent(baseSource({ recommendations: recB }));
    expect(computeSnapshotHash(sealedA, SECRET)).not.toBe(
      computeSnapshotHash(sealedB, SECRET),
    );
  });
});

describe("verifySnapshotHash", () => {
  it("returns 'unhashed' (never 'mismatch') for a legacy doc with no integrity block", () => {
    const result = verifySnapshotHash(baseSource(), SECRET);
    expect(result.status).toBe("unhashed");
  });

  it("returns 'unhashed' for an empty-but-truthy integrity object (Mongoose's default for an unset nested path), not 'mismatch'", () => {
    // Reproduces a real bug: Mongoose auto-initializes an unset nested
    // schema path to `{}` in-process, so a naive `!doc.integrity` check
    // treats it as "hashed" and falls through to a false "mismatch"
    // against an undefined contentHash. See generateSnapshot's $unset for
    // the write-side half of this fix.
    const result = verifySnapshotHash(
      { ...baseSource(), integrity: {} as ISnapshotIntegrity },
      SECRET,
    );
    expect(result.status).toBe("unhashed");
  });

  it("returns 'verified' when the stored hash matches the recomputed one", () => {
    const source = baseSource();
    const sealed = buildSealedContent(source);
    const contentHash = computeSnapshotHash(sealed, SECRET);
    const integrity: ISnapshotIntegrity = {
      algorithm: "hmac-sha256",
      contentHash,
      contentVersion: source.schemaVersion,
      hashedAt: new Date(),
      keyId: "key-1",
    };
    const result = verifySnapshotHash({ ...source, integrity }, SECRET);
    expect(result.status).toBe("verified");
  });

  it("returns 'mismatch' when content was altered after hashing", () => {
    const source = baseSource();
    const sealed = buildSealedContent(source);
    const contentHash = computeSnapshotHash(sealed, SECRET);
    const integrity: ISnapshotIntegrity = {
      algorithm: "hmac-sha256",
      contentHash,
      contentVersion: source.schemaVersion,
      hashedAt: new Date(),
      keyId: "key-1",
    };
    const tampered = {
      ...source,
      scores: { ...source.scores, overall: 999 },
      integrity,
    };
    const result = verifySnapshotHash(tampered, SECRET);
    expect(result.status).toBe("mismatch");
  });
});
