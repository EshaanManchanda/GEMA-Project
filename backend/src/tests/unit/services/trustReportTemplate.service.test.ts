import {
  buildTrustReportHtml,
  compactNumber,
  niceScale,
  svgLine,
  svgDonut,
} from "../../../services/trustReportTemplate.service";
import { fixtureReport } from "../../helpers/trustReportFixture";

describe("buildTrustReportHtml", () => {
  it("renders cover, KPIs, scope chips, growth and SVG charts", () => {
    const html = buildTrustReportHtml(fixtureReport());
    expect(html).toContain("Platform Highlights");
    expect(html).toContain("Last 13 weeks · 13 Jul 2026 – 11 Oct 2026");
    expect(html).toContain("1.2K+");
    expect(html).toContain("Lifetime");
    expect(html).toContain("▲ 20% vs previous 13 weeks");
    expect((html.match(/<svg/g) || []).length).toBeGreaterThanOrEqual(5);
    expect(html).toContain("Google Search data through 11 Oct 2026");
    expect(html).toContain("Register free at kidrove.com");
    expect(html).not.toMatch(/<script/i);
  });

  it("leaks no vendor sales, exact location counts or Search Console properties", () => {
    const html = buildTrustReportHtml(fixtureReport());
    expect(html).not.toMatch(/tickets issued|check-ins/i);
    expect(html).not.toContain("40 · 80%"); // shares only on location bars
    expect(html).toContain("80%");
    expect(html).not.toContain("properties included");
  });

  it("escapes user-controlled text", () => {
    const html = buildTrustReportHtml(fixtureReport());
    expect(html).toContain("Robotics &lt;script&gt;alert(1)&lt;/script&gt; Camp");
  });

  it("contains no money or negative-metric wording", () => {
    const html = buildTrustReportHtml(fixtureReport()).toLowerCase();
    for (const word of ["aed", "revenue", "refund", "commission", "payout", "cancel", "drop-off", "ctr"]) {
      expect(html).not.toContain(word);
    }
  });

  it("omits missing sections without orphan headings or empty charts", () => {
    const html = buildTrustReportHtml(
      fixtureReport({ search: undefined, ages: undefined, locations: undefined, blogs: undefined }),
    );
    expect(html).not.toContain("Found on Google");
    expect(html).not.toContain("Who Joins Us");
    expect(html).not.toContain("Where Families Join Us");
    expect(html).not.toContain("Most viewed articles");
    expect(html).not.toMatch(/<h3>[^<]*<\/h3>\s*<\/div>/); // sub-heading with no body
  });

  it("renders a valid document for a fully empty report", () => {
    const r = fixtureReport();
    const html = buildTrustReportHtml({ ...r, kpis: [], sections: {} });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).not.toContain('class="card');
    expect(html).not.toContain("<svg");
    expect(html).toContain("Join the Kidrove community");
  });

  it("handles very long titles without breaking markup", () => {
    const long = "A".repeat(200);
    const html = buildTrustReportHtml(
      fixtureReport({ events: { publishedEvents: 1, top: [{ title: long, place: "B".repeat(200), views: 1 }] } }),
    );
    expect(html).not.toContain(long);
    expect(html).toContain("…");
    expect((html.match(/<tr>/g) || []).length).toBe((html.match(/<\/tr>/g) || []).length);
  });
});

describe("chart kit", () => {
  it("formats compact numbers honestly", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1200)).toBe("1.2K");
    expect(compactNumber(1290)).toBe("1.2K+");
    expect(compactNumber(2_500_001)).toBe("2.5M+");
  });

  it("builds nice scales", () => {
    expect(niceScale(87)).toEqual({ max: 100, step: 25 });
    expect(niceScale(3)).toEqual({ max: 4, step: 1 });
  });

  it("returns nothing for empty or all-zero data", () => {
    expect(svgLine([], "day", { ariaLabel: "x" })).toBe("");
    expect(svgLine([{ key: "2026-10-01", value: 0 }], "day", { ariaLabel: "x" })).toBe("");
    expect(svgDonut([], { ariaLabel: "x", centerLabel: "y" })).toBe("");
  });

  it("never emits NaN coordinates", () => {
    const svg = svgLine([{ key: "2026-10-01", value: 5 }], "day", { ariaLabel: "x" });
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("Infinity");
  });
});
