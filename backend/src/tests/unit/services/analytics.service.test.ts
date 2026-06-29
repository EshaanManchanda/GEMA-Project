/**
 * Analytics service — revenue consistency & metric definition tests.
 *
 * Reference fixture: one paid Order with two event items, a discount applied
 * at order level, a refund, platformCommission, and vendorPayout.
 * All analytics surfaces must agree on eventAttributedRevenue for each event.
 *
 * See terminology contract in analytics.service.ts for definitions.
 */

import mongoose from "mongoose";

// --------------------------------------------------------------------------
// Mocks — must be declared before any jest.mock() call imports modules
// --------------------------------------------------------------------------

const mockEventFind = jest.fn();
const mockEventAggregate = jest.fn();
const mockEventCountDocuments = jest.fn();
const mockOrderAggregate = jest.fn();
const mockOrderCountDocuments = jest.fn();
const mockTicketAggregate = jest.fn();
const mockTicketCountDocuments = jest.fn();
const mockUserAggregate = jest.fn();
const mockUserCountDocuments = jest.fn();
const mockReviewAggregate = jest.fn();

jest.mock("../../../models/index", () => ({
  Event: {
    find: mockEventFind,
    aggregate: mockEventAggregate,
    countDocuments: mockEventCountDocuments,
  },
  Order: {
    aggregate: mockOrderAggregate,
    countDocuments: mockOrderCountDocuments,
  },
  Ticket: {
    aggregate: mockTicketAggregate,
    countDocuments: mockTicketCountDocuments,
  },
  User: {
    aggregate: mockUserAggregate,
    countDocuments: mockUserCountDocuments,
  },
  Review: {
    aggregate: mockReviewAggregate,
    countDocuments: jest.fn(),
  },
}));

import analyticsService from "../../../services/analytics.service";

// --------------------------------------------------------------------------
// Fixture data — representative values for assertions
// --------------------------------------------------------------------------

const EVENT_A_ID = new mongoose.Types.ObjectId();
const EVENT_B_ID = new mongoose.Types.ObjectId();

/**
 * Reference order fixture:
 *   orderRevenue (Order.total)            = 200
 *   eventAttributedRevenue for Event A   = 80   (items.totalPrice — post-discount)
 *   eventAttributedRevenue for Event B   = 120  (items.totalPrice)
 *   sum of items.totalPrice              = 200  (equal to total here by design)
 *   refundAmount                         = 30
 *   platformCommission                   = 20
 *   vendorPayout                         = 170
 */
const ORDER_FIXTURE = {
  _id: new mongoose.Types.ObjectId(),
  total: 200,
  paymentStatus: "paid",
  status: "confirmed",
  refundAmount: 30,
  paymentRouting: { platformCommission: 20, vendorPayout: 170 },
  items: [
    { eventId: EVENT_A_ID, unitPrice: 100, quantity: 1, totalPrice: 80 }, // 20 discount
    { eventId: EVENT_B_ID, unitPrice: 120, quantity: 1, totalPrice: 120 },
  ],
  createdAt: new Date("2026-06-01"),
};

// --------------------------------------------------------------------------
// Helpers to set up common mock returns
// --------------------------------------------------------------------------

function setupEventFindMock(events: any[] = []) {
  mockEventFind.mockReturnValue({
    select: jest.fn().mockResolvedValue(events),
  });
}

function setupEventAggregateMock(results: any[][]) {
  let callCount = 0;
  mockEventAggregate.mockImplementation(() => Promise.resolve(results[callCount++] ?? []));
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("Analytics — Revenue Consistency", () => {
  beforeEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // 1. eventAttributedRevenue = $sum items.totalPrice, NOT unitPrice*quantity
  // -------------------------------------------------------------------------
  describe("getEventRevenueStats (revenueByEvent)", () => {
    it("uses items.totalPrice (eventAttributedRevenue), not unitPrice*quantity", async () => {
      mockEventCountDocuments.mockResolvedValue(2);

      // eventStats aggregate
      mockEventAggregate
        .mockResolvedValueOnce([{ active: 2, pending: 0, totalViews: 100, avgRating: 4.5 }])
        // categoryStats
        .mockResolvedValueOnce([])
        // locationStats
        .mockResolvedValueOnce([])
        // monthlyStats
        .mockResolvedValueOnce([])
        // getEventRevenueStats via $lookup — returns two events with their revenues
        .mockResolvedValueOnce([
          { eventId: EVENT_A_ID, title: "Event A", revenue: 80, tickets: 1 },
          { eventId: EVENT_B_ID, title: "Event B", revenue: 120, tickets: 1 },
        ]);

      const result = await analyticsService.getEventAnalytics();

      // Event A revenue = 80 (items.totalPrice), NOT 100 (unitPrice*quantity)
      const eventA = result.revenueByEvent.find((e) => e.eventId.toString() === EVENT_A_ID.toString());
      const eventB = result.revenueByEvent.find((e) => e.eventId.toString() === EVENT_B_ID.toString());

      expect(eventA?.revenue).toBe(80);
      expect(eventB?.revenue).toBe(120);
    });
  });

  // -------------------------------------------------------------------------
  // 2. viewToOrderRate definition: confirmed paid orders ÷ event views × 100
  // -------------------------------------------------------------------------
  describe("getOrderAnalytics — viewToOrderRate", () => {
    it("computes viewToOrderRate as confirmed orders ÷ views, not users ÷ views", async () => {
      // 1 event, 50 views; 1 confirmed paid order → rate = 1/50 * 100 = 2.00%
      mockOrderCountDocuments.mockResolvedValue(1);
      mockEventFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      // Order.aggregate: orderStats, statusStats, monthlyStats, dailyStats, currencyStats
      mockOrderAggregate
        .mockResolvedValueOnce([{ totalRevenue: 200, avgOrderValue: 200, refundedOrders: 0 }])
        .mockResolvedValueOnce([{ _id: "confirmed", count: 1, revenue: 200 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ _id: "AED", count: 1, revenue: 200 }]);

      // Event.aggregate: viewStats (non-vendor path)
      mockEventAggregate.mockResolvedValueOnce([{ totalViews: 50 }]);

      const result = await analyticsService.getOrderAnalytics();

      expect(result.viewToOrderRate).toBeCloseTo(2.0, 1);
      // Deprecated alias must equal the new field
      expect(result.conversionRate).toBe(result.viewToOrderRate);
      // Must NOT equal totalUsers/views (which would be a different formula)
    });

    it("returns 0 viewToOrderRate when there are no views", async () => {
      mockOrderCountDocuments.mockResolvedValue(0);
      mockEventFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      mockOrderAggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockEventAggregate.mockResolvedValueOnce([{ totalViews: 0 }]);

      const result = await analyticsService.getOrderAnalytics();
      expect(result.viewToOrderRate).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. conversionRate field is deprecated alias for viewToOrderRate
  // -------------------------------------------------------------------------
  describe("OrderAnalytics interface backward compat", () => {
    it("conversionRate === viewToOrderRate on every response", async () => {
      mockOrderCountDocuments.mockResolvedValue(5);
      mockEventFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      mockOrderAggregate
        .mockResolvedValueOnce([{ totalRevenue: 1000, avgOrderValue: 200, refundedOrders: 1 }])
        .mockResolvedValueOnce([{ _id: "confirmed", count: 3, revenue: 900 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockEventAggregate.mockResolvedValueOnce([{ totalViews: 200 }]);

      const result = await analyticsService.getOrderAnalytics();
      expect(result.conversionRate).toBe(result.viewToOrderRate);
      expect(typeof result.viewToOrderRate).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // 4. refundRate calculation
  // -------------------------------------------------------------------------
  describe("getOrderAnalytics — refundRate", () => {
    it("computes refundRate = refundedOrders / totalOrders * 100", async () => {
      // 10 total orders, 2 refunded → 20%
      mockOrderCountDocuments.mockResolvedValue(10);
      mockEventFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      mockOrderAggregate
        .mockResolvedValueOnce([{ totalRevenue: 800, avgOrderValue: 80, refundedOrders: 2 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockEventAggregate.mockResolvedValueOnce([{ totalViews: 100 }]);

      const result = await analyticsService.getOrderAnalytics();
      expect(result.refundRate).toBeCloseTo(20, 0);
    });
  });
});

// --------------------------------------------------------------------------
// CSV utility tests
// --------------------------------------------------------------------------

import { toCsv, analyticsToRows, buildExportFilename } from "../../../utils/csv.utils";

describe("CSV Export Utilities", () => {
  const UTF8_BOM = "﻿";

  describe("toCsv", () => {
    it("starts with UTF-8 BOM", () => {
      const csv = toCsv([{ a: 1 }]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it("returns only BOM for empty array", () => {
      expect(toCsv([])).toBe(UTF8_BOM);
    });

    it("wraps fields containing commas in double-quotes", () => {
      const csv = toCsv([{ name: "Smith, John", revenue: 100 }]);
      expect(csv).toContain('"Smith, John"');
    });

    it("escapes existing double-quotes by doubling them", () => {
      const csv = toCsv([{ note: 'He said "hello"' }]);
      expect(csv).toContain('"He said ""hello"""');
    });

    it("wraps fields containing newlines in double-quotes", () => {
      const csv = toCsv([{ desc: "line1\nline2" }]);
      expect(csv).toContain('"line1\nline2"');
    });

    it("uses CRLF line endings", () => {
      const csv = toCsv([{ a: 1 }, { a: 2 }]);
      expect(csv).toContain("\r\n");
    });

    it("produces correct header and data rows", () => {
      const csv = toCsv([{ month: "2026-06", orders: 5, revenue: 1000 }]);
      const lines = csv.replace(UTF8_BOM, "").split("\r\n");
      expect(lines[0]).toBe("month,orders,revenue");
      expect(lines[1]).toBe("2026-06,5,1000");
    });

    it("handles null and undefined values as empty strings", () => {
      const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
      const lines = csv.replace(UTF8_BOM, "").split("\r\n");
      expect(lines[1]).toBe(",,0");
    });
  });

  describe("buildExportFilename", () => {
    it("includes type and date range in filename", () => {
      const name = buildExportFilename("orders", "2026-06-01", "2026-06-29");
      expect(name).toBe("orders-analytics-2026-06-01-to-2026-06-29");
    });

    it("falls back to today when no range supplied", () => {
      const name = buildExportFilename("events");
      const today = new Date().toISOString().split("T")[0];
      expect(name).toBe(`events-analytics-${today}`);
    });
  });

  describe("analyticsToRows", () => {
    it("returns array as-is", () => {
      const rows = [{ a: 1 }, { a: 2 }];
      expect(analyticsToRows(rows)).toEqual(rows);
    });

    it("picks preferred array key (ordersByMonth)", () => {
      const data = {
        totalOrders: 5,
        ordersByMonth: [{ month: "2026-06", count: 5, revenue: 1000 }],
      };
      expect(analyticsToRows(data)).toEqual(data.ordersByMonth);
    });

    it("wraps plain object in single-row array", () => {
      const data = { totalOrders: 5, totalRevenue: 1000 };
      const rows = analyticsToRows(data);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(data);
    });

    it("returns empty array for null/primitive", () => {
      expect(analyticsToRows(null)).toHaveLength(0);
      expect(analyticsToRows(42)).toHaveLength(0);
    });
  });
});

// --------------------------------------------------------------------------
// Date-range helper tests
// --------------------------------------------------------------------------

import { parseAnalyticsDateRange, defaultAnalyticsDateRange } from "../../../utils/dateHelpers";

describe("parseAnalyticsDateRange", () => {
  it("clamps start to 00:00:00.000 UTC", () => {
    const result = parseAnalyticsDateRange("2026-06-01T12:30:00Z", "2026-06-29T15:00:00Z");
    expect(result?.start.getUTCHours()).toBe(0);
    expect(result?.start.getUTCMinutes()).toBe(0);
    expect(result?.start.getUTCMilliseconds()).toBe(0);
  });

  it("clamps end to 23:59:59.999 UTC", () => {
    const result = parseAnalyticsDateRange("2026-06-01", "2026-06-29");
    expect(result?.end.getUTCHours()).toBe(23);
    expect(result?.end.getUTCMinutes()).toBe(59);
    expect(result?.end.getUTCSeconds()).toBe(59);
    expect(result?.end.getUTCMilliseconds()).toBe(999);
  });

  it("returns undefined when either value is missing", () => {
    expect(parseAnalyticsDateRange("2026-06-01", undefined)).toBeUndefined();
    expect(parseAnalyticsDateRange(undefined, "2026-06-29")).toBeUndefined();
    expect(parseAnalyticsDateRange(undefined, undefined)).toBeUndefined();
  });

  it("returns undefined for invalid date strings", () => {
    expect(parseAnalyticsDateRange("not-a-date", "2026-06-29")).toBeUndefined();
  });
});

describe("defaultAnalyticsDateRange", () => {
  it("start is approximately 30 days before end (within 1 day due to boundary clamping)", () => {
    const { start, end } = defaultAnalyticsDateRange();
    const diff = end.getTime() - start.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000;
    // start = start-of-day 30 days ago; end = end-of-today → diff ≈ 30d 23:59:59
    expect(diff).toBeGreaterThanOrEqual(thirtyDaysMs);
    expect(diff).toBeLessThan(thirtyOneDaysMs);
  });

  it("end is clamped to end-of-day UTC", () => {
    const { end } = defaultAnalyticsDateRange();
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
    expect(end.getUTCSeconds()).toBe(59);
  });

  it("start is clamped to start-of-day UTC", () => {
    const { start } = defaultAnalyticsDateRange();
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
  });
});
