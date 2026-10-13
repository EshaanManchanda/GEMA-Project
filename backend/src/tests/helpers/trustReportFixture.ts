/** Shared Platform Highlights fixture for template + real-PDF tests. */
import { TrustReport, resolveReportPeriod, buildKpis } from "../../services/trustReport.service";

export const NOW = new Date("2026-10-13T12:00:00Z");

export function fixtureReport(overrides: Partial<TrustReport["sections"]> = {}): TrustReport {
  const { current, previous } = resolveReportPeriod("90d", NOW);
  const sections: TrustReport["sections"] = {
    community: {
      totalUsers: 1290,
      newUsers: 120,
      previousNewUsers: 100,
      unit: "week",
      cumulative: [
        { key: "2026-07-13", value: 1180 },
        { key: "2026-07-20", value: 1180 },
        { key: "2026-07-27", value: 1290 },
      ],
      activity: [
        { key: "2026-07-13", value: 10 },
        { key: "2026-07-20", value: 0 },
        { key: "2026-07-27", value: 110 },
      ],
    },
    ages: {
      kids: { bins: [{ label: "6–8", pct: 40 }, { label: "9–12", pct: 60 }], basedOn: 50 },
    },
    locations: {
      communityCountries: [{ label: "United Arab Emirates", count: 40, pct: 80 }, { label: "Other", count: 10, pct: 20 }],
    },
    engagement: {
      coverage: { start: new Date("2026-07-15T00:00:00Z"), end: new Date("2026-10-13T00:00:00Z") },
      pageViews: 5400,
      uniqueVisitors: 1800,
      eventPageOpens: 0,
      devices: [{ label: "Mobile", count: 4000, pct: 74 }, { label: "Desktop", count: 1400, pct: 26 }],
      daily: [{ key: "2026-10-11", value: 50 }, { key: "2026-10-12", value: 70 }],
    },
    search: {
      sites: ["sc-domain:kidrove.com"],
      coverage: { start: new Date("2026-07-15T00:00:00Z"), end: new Date("2026-10-11T23:59:59Z") },
      clicks: 2400,
      impressions: 88000,
      avgPosition: 6.2,
      trend: [{ key: "2026-10-10", clicks: 20, impressions: 900 }, { key: "2026-10-11", clicks: 30, impressions: 1000 }],
      topQueries: [{ query: "kids classes dubai", clicks: 120, impressions: 3000 }],
    },
    events: {
      publishedEvents: 85,
      top: [{ title: "Robotics <script>alert(1)</script> Camp", place: "Dubai", views: 900 }],
    },
    blogs: { totalViews: 3000, top: [{ title: "10 things to do", category: "Guides", views: 700 }] },
    ...overrides,
  };
  return {
    generatedAt: NOW.toISOString(),
    range: "90d",
    period: current,
    previousPeriod: previous,
    kpis: buildKpis({ period: current, sections }),
    sections,
    diagnostics: [],
  };
}

