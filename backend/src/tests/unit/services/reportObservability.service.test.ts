/**
 * reportObservability.service.ts — logReportGeneration must never throw.
 *
 * Observability is a side channel: a write failure here (bad connection,
 * validation error, whatever) must never fail the report-generation
 * operation it's observing. This is the one behavioral contract that
 * matters for this module — everything else is a thin passthrough to
 * ReportGenerationLog.create.
 */

import { logReportGeneration } from "../../../services/reportObservability.service";
import ReportGenerationLog, {
  ReportGenerationOperation,
  ReportGenerationStatus,
  ReportGenerationTrigger,
} from "../../../models/ReportGenerationLog";

describe("logReportGeneration", () => {
  it("resolves without throwing when the underlying model write rejects", async () => {
    const createSpy = jest
      .spyOn(ReportGenerationLog, "create")
      .mockRejectedValueOnce(new Error("DB unavailable"));

    await expect(
      logReportGeneration({
        operation: ReportGenerationOperation.SNAPSHOT_GENERATE,
        status: ReportGenerationStatus.SUCCEEDED,
        trigger: ReportGenerationTrigger.ADMIN_REQUEST,
        durationMs: 10,
      }),
    ).resolves.toBeUndefined();

    createSpy.mockRestore();
  });

  it("calls ReportGenerationLog.create with the entry it was given", async () => {
    const createSpy = jest
      .spyOn(ReportGenerationLog, "create")
      .mockResolvedValueOnce({} as any);

    const entry = {
      operation: ReportGenerationOperation.PDF_RENDER,
      status: ReportGenerationStatus.CACHE_HIT,
      trigger: ReportGenerationTrigger.VENDOR_REQUEST,
      durationMs: 5,
    };
    await logReportGeneration(entry);

    expect(createSpy).toHaveBeenCalledWith(entry);
    createSpy.mockRestore();
  });
});
