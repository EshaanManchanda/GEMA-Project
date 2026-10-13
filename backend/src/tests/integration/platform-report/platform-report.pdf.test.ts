/**
 * Real-PDF test for the Platform Highlights report: renders the fixture
 * through actual Puppeteer (renderReportPdf is NOT mocked here).
 *
 * PDF text is compressed, so wording/heading checks live in
 * trustReportTemplate.service.test.ts; this file checks that the document
 * renders, is a valid multi-page PDF, and degrades cleanly when sections
 * are missing. Skips (with a message) if Chromium can't launch on this box.
 *
 * Set TRUST_PDF_OUT=<dir> to also write the PDFs for a visual check.
 */
import fs from "fs";
import path from "path";
import { renderReportPdf } from "../../../utils/pdf.utils";
import { buildTrustReportHtml } from "../../../services/trustReportTemplate.service";
import { fixtureReport } from "../../helpers/trustReportFixture";

jest.setTimeout(120_000);

const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) || []).length;

let chromiumAvailable = true;

beforeAll(async () => {
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: true, args: ["--no-sandbox"] });
    await browser.close();
  } catch (err: any) {
    chromiumAvailable = false;
    process.stdout.write(`\n[platform-report.pdf] SKIPPED — Chromium unavailable: ${err?.message}\n`);
  }
});

const render = async (name: string, html: string) => {
  const pdf = await renderReportPdf(html, { footerText: "Kidrove Platform Highlights · Last 13 weeks", offline: true });
  if (process.env.TRUST_PDF_OUT) fs.writeFileSync(path.join(process.env.TRUST_PDF_OUT, `${name}.pdf`), pdf);
  return pdf;
};

describe("Platform Highlights — real PDF rendering", () => {
  it("renders the full report as a valid multi-page PDF", async () => {
    if (!chromiumAvailable) return;
    const pdf = await render("full", buildTrustReportHtml(fixtureReport()));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1").trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pageCount(pdf)).toBeGreaterThan(2);
    expect(pdf.length).toBeGreaterThan(10_000);
  });

  it("renders a valid PDF when every section is missing", async () => {
    if (!chromiumAvailable) return;
    const r = fixtureReport();
    const pdf = await render("empty", buildTrustReportHtml({ ...r, kpis: [], sections: {} }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
  });
});
