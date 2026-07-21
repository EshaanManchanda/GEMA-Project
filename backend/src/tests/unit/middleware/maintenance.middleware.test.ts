/**
 * Unit tests for maintenanceModeGuard — the global middleware that returns
 * 503 MAINTENANCE_MODE for public traffic while `maintenanceMode` is on,
 * while always letting admin/auth-login/health/webhook paths through.
 */

import { maintenanceModeGuard } from "../../../middleware/maintenance.middleware";
import { isMaintenanceMode } from "../../../services/settings.service";
import { authenticateOptional } from "../../../middleware/auth";
import { UserRole } from "../../../models/User";
import { mockRequest, mockResponse, mockNext } from "../../helpers/testHelpers";

jest.mock("../../../services/settings.service");
jest.mock("../../../middleware/auth", () => ({
  authenticateOptional: jest.fn(),
}));
jest.mock("../../../config/logger");

const mockedIsMaintenanceMode = isMaintenanceMode as jest.Mock;
const mockedAuthenticateOptional = authenticateOptional as jest.Mock;

describe("maintenanceModeGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes through immediately for exempt paths without checking the setting", async () => {
    const req: any = mockRequest({ path: "/api/admin/dashboard" });
    const res = mockResponse();
    const next = mockNext();

    await maintenanceModeGuard(req, res, next);

    expect(mockedIsMaintenanceMode).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("calls next() for a public path when maintenance mode is off", async () => {
    mockedIsMaintenanceMode.mockResolvedValue(false);
    const req: any = mockRequest({ path: "/api/events" });
    const res = mockResponse();
    const next = mockNext();

    await maintenanceModeGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 503 MAINTENANCE_MODE for a public path when maintenance mode is on and no admin", async () => {
    mockedIsMaintenanceMode.mockResolvedValue(true);
    mockedAuthenticateOptional.mockImplementation(async (_req, _res, cb) => cb());
    const req: any = mockRequest({ path: "/api/events" });
    const res: any = mockResponse();
    res.set = jest.fn().mockReturnThis();
    const next = mockNext();

    await maintenanceModeGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: "MAINTENANCE_MODE" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("lets an authenticated admin through even when maintenance mode is on", async () => {
    mockedIsMaintenanceMode.mockResolvedValue(true);
    mockedAuthenticateOptional.mockImplementation(async (req, _res, cb) => {
      req.user = { role: UserRole.ADMIN };
      cb();
    });
    const req: any = mockRequest({ path: "/api/events" });
    const res = mockResponse();
    const next = mockNext();

    await maintenanceModeGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("fails open (calls next) if reading the setting throws", async () => {
    mockedIsMaintenanceMode.mockRejectedValue(new Error("DB down"));
    const req: any = mockRequest({ path: "/api/events" });
    const res = mockResponse();
    const next = mockNext();

    await maintenanceModeGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
