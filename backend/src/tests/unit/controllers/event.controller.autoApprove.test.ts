/**
 * Unit tests — autoApproveEvents setting, at the event.controller.ts level.
 *
 * Note: createEvent() ultimately calls eventService.createEvent(), which
 * wraps the write in an explicit Mongo session/transaction
 * (mongoose.startSession() + startTransaction()). That requires a real
 * replica set; the shared integration-test harness's MongoMemoryServer
 * instance (tests/integration/setup/testDB.ts) runs as a plain standalone
 * server, so
 * a full HTTP round-trip through the real transaction always fails here
 * with "Transaction numbers are only allowed on a replica set member or
 * mongos" — a pre-existing test-infra limitation unrelated to this
 * feature. Testing at the controller level instead (mocking eventService)
 * still gives full coverage of the new autoApproveEvents branch: it
 * verifies the exact `isApproved`/`status` computed and handed to
 * eventService.createEvent for each toggle state, and the pending-vendor
 * gate that runs before eventService is ever reached.
 */

import { createEvent } from "../../../controllers/event.controller";
import { eventService } from "../../../services/event.service";
import { shouldAutoApproveEvents } from "../../../services/settings.service";
import User from "../../../models/User";
import Vendor, { VerificationStatus } from "../../../models/Vendor";
import { invalidateEventCaches } from "../../../utils/cache.utils";
import { mockRequest, mockResponse, mockNext, generateObjectId } from "../../helpers/testHelpers";

jest.mock("../../../services/event.service", () => ({
  eventService: { createEvent: jest.fn() },
}));
jest.mock("../../../services/settings.service", () => ({
  shouldAutoApproveEvents: jest.fn(),
}));
jest.mock("../../../models/User");
jest.mock("../../../models/Vendor", () => {
  const actual = jest.requireActual("../../../models/Vendor");
  return { __esModule: true, ...actual, default: { findOne: jest.fn() } };
});
jest.mock("../../../utils/cache.utils", () => ({
  invalidateEventCaches: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../config/logger");

const mockedCreateEvent = eventService.createEvent as jest.Mock;
const mockedShouldAutoApprove = shouldAutoApproveEvents as jest.Mock;
const mockedUserFindById = User.findById as jest.Mock;
const mockedVendorFindOne = Vendor.findOne as jest.Mock;

function leanQuery(result: any) {
  return { lean: jest.fn().mockResolvedValue(result) };
}

describe("createEvent — autoApproveEvents enforcement", () => {
  const vendorUserId = generateObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserFindById.mockReturnValue(leanQuery({ _id: vendorUserId, role: "vendor" }));
    mockedVendorFindOne.mockReturnValue({
      select: jest.fn().mockReturnValue(leanQuery({ verificationStatus: VerificationStatus.VERIFIED })),
    });
    mockedCreateEvent.mockImplementation((data: any) => Promise.resolve({ _id: "event-1", ...data }));
  });

  it("creates a pending, unapproved event when the toggle is off", async () => {
    mockedShouldAutoApprove.mockResolvedValue(false);
    const req: any = mockRequest({
      user: { _id: vendorUserId },
      body: { title: "Robotics Workshop" },
    });
    const res = mockResponse();
    const next = mockNext();

    await createEvent(req, res, next);

    expect(mockedCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ isApproved: false, status: "pending" }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(invalidateEventCaches).toHaveBeenCalled();
  });

  it("creates a published, approved event when the toggle is on", async () => {
    mockedShouldAutoApprove.mockResolvedValue(true);
    const req: any = mockRequest({
      user: { _id: vendorUserId },
      body: { title: "Robotics Workshop" },
    });
    const res = mockResponse();
    const next = mockNext();

    await createEvent(req, res, next);

    expect(mockedCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ isApproved: true, status: "published" }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("blocks event creation for a vendor still pending approval, regardless of autoApproveEvents", async () => {
    mockedShouldAutoApprove.mockResolvedValue(true); // even with this ON...
    // ...a vendor whose profile is still PENDING must still be blocked.
    mockedVendorFindOne.mockReturnValue({
      select: jest.fn().mockReturnValue(leanQuery({ verificationStatus: VerificationStatus.PENDING })),
    });
    const req: any = mockRequest({
      user: { _id: vendorUserId },
      body: { title: "Robotics Workshop" },
    });
    const res = mockResponse();
    const next = mockNext();

    await createEvent(req, res, next);

    expect(mockedCreateEvent).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("rejects non-vendor callers before reaching the auto-approve check", async () => {
    mockedUserFindById.mockReturnValue(leanQuery({ _id: vendorUserId, role: "customer" }));
    const req: any = mockRequest({
      user: { _id: vendorUserId },
      body: { title: "Robotics Workshop" },
    });
    const res = mockResponse();
    const next = mockNext();

    await createEvent(req, res, next);

    expect(mockedCreateEvent).not.toHaveBeenCalled();
    expect(mockedShouldAutoApprove).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
