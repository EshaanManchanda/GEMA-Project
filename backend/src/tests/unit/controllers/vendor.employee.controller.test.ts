/**
 * Unit tests for Vendor Employee Controllers
 * Tests the business logic of employee management endpoints
 */

import {
  getVendorEmployees,
  getVendorEmployeeById,
  createVendorEmployee,
  updateVendorEmployee,
  deleteVendorEmployee,
  assignEmployeeToEvent,
  removeEmployeeFromEvent,
  exportVendorEmployees,
} from "../../../controllers/vendor.controller";
import { Employee, User, Event, UserRole } from "../../../models";
import { AppError } from "../../../middleware/error";
import emailService from "../../../services/email.service";
import mongoose from "mongoose";
import {
  mockRequest,
  mockResponse,
  mockNext,
  generateObjectId,
  mockVendorUser,
  mockEmployee,
  mockEvent,
  createMockQuery,
  mockMongooseSession,
} from "../../helpers/testHelpers";

// Mock the models
jest.mock("../../../models");
jest.mock("mongoose");

describe("Vendor Employee Controllers - Unit Tests", () => {
  let req: any;
  let res: any;
  let next: any;
  let vendorId: string;

  beforeEach(() => {
    vendorId = generateObjectId();
    req = mockRequest({
      user: mockVendorUser(vendorId),
    });
    res = mockResponse();
    next = mockNext();

    // Clear all mocks
    jest.clearAllMocks();
  });

  // ===================== GET VENDOR EMPLOYEES =====================
  describe("getVendorEmployees", () => {
    it("should return employees list with pagination and stats", async () => {
      const mockEmployees = [
        mockEmployee({ vendorId }),
        mockEmployee({ vendorId }),
      ];

      const mockStats = [
        {
          totalEmployees: 2,
          activeEmployees: 2,
          inactiveEmployees: 0,
          suspendedEmployees: 0,
          managerCount: 0,
          scannerCount: 2,
          coordinatorCount: 0,
          securityCount: 0,
        },
      ];

      req.query = { page: 1, limit: 10 };

      (Employee.find as jest.Mock).mockReturnValue(
        createMockQuery(mockEmployees),
      );
      (Employee.countDocuments as jest.Mock).mockResolvedValue(2);
      (Employee.aggregate as jest.Mock).mockResolvedValue(mockStats);

      await getVendorEmployees(req, res, next);

      expect(Employee.find).toHaveBeenCalledWith({ vendorId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Vendor employees retrieved successfully",
        data: {
          employees: mockEmployees,
          pagination: {
            page: 1,
            totalPages: 1,
            totalEmployees: 2,
            hasNextPage: false,
            hasPrevPage: false,
            limit: 10,
          },
          stats: mockStats[0],
        },
      });
    });

    it("should apply search filter correctly", async () => {
      req.query = { page: 1, limit: 10, search: "john" };

      (Employee.find as jest.Mock).mockReturnValue(createMockQuery([]));
      (Employee.countDocuments as jest.Mock).mockResolvedValue(0);
      (Employee.aggregate as jest.Mock).mockResolvedValue([]);

      await getVendorEmployees(req, res, next);

      expect(Employee.find).toHaveBeenCalledWith({
        vendorId,
        $or: [
          { firstName: expect.any(RegExp) },
          { lastName: expect.any(RegExp) },
          { email: expect.any(RegExp) },
          { employeeId: expect.any(RegExp) },
          { phone: expect.any(RegExp) },
        ],
      });
    });

    it("should apply role and status filters", async () => {
      req.query = { page: 1, limit: 10, role: "manager", status: "active" };

      (Employee.find as jest.Mock).mockReturnValue(createMockQuery([]));
      (Employee.countDocuments as jest.Mock).mockResolvedValue(0);
      (Employee.aggregate as jest.Mock).mockResolvedValue([]);

      await getVendorEmployees(req, res, next);

      expect(Employee.find).toHaveBeenCalledWith({
        vendorId,
        role: "manager",
        status: "active",
      });
    });

    it("should return error if vendorId not found", async () => {
      req.user = null;

      await getVendorEmployees(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Vendor ID not found",
          statusCode: 401,
        }),
      );
    });
  });

  // ===================== GET VENDOR EMPLOYEE BY ID =====================
  describe("getVendorEmployeeById", () => {
    it("should return single employee by ID", async () => {
      const mockEmp = mockEmployee({ vendorId });
      req.params = { id: mockEmp._id };

      (Employee.findOne as jest.Mock).mockReturnValue(createMockQuery(mockEmp));

      await getVendorEmployeeById(req, res, next);

      expect(Employee.findOne).toHaveBeenCalledWith({
        _id: mockEmp._id,
        vendorId,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Employee retrieved successfully",
        data: { employee: mockEmp },
      });
    });

    it("should return 404 if employee not found", async () => {
      req.params = { id: generateObjectId() };

      (Employee.findOne as jest.Mock).mockReturnValue(createMockQuery(null));

      await getVendorEmployeeById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Employee not found",
          statusCode: 404,
        }),
      );
    });
  });

  // ===================== CREATE VENDOR EMPLOYEE =====================
  describe("createVendorEmployee", () => {
    it("should create new employee and user successfully", async () => {
      const employeeData = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@test.com",
        phone: "+1234567890",
        role: "scanner",
      };

      req.body = employeeData;

      const mockUser = {
        _id: generateObjectId(),
        ...employeeData,
        role: UserRole.EMPLOYEE,
      };

      const mockEmp = mockEmployee({
        vendorId,
        userId: mockUser._id,
        ...employeeData,
      });

      (Employee.findOne as jest.Mock).mockResolvedValue(null); // No existing employee
      (User.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (Employee.countDocuments as jest.Mock).mockResolvedValue(0);
      (Employee.create as jest.Mock).mockResolvedValue(mockEmp);
      (Employee.findById as jest.Mock).mockReturnValue(
        createMockQuery(mockEmp),
      );
      (User.findById as jest.Mock).mockResolvedValue({
        firstName: "Test",
        lastName: "Vendor",
      });

      await createVendorEmployee(req, res, next);

      expect(User.create).toHaveBeenCalled();
      expect(Employee.create).toHaveBeenCalled();
      expect(emailService.sendEmployeeWelcomeEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining("Employee created successfully"),
        data: { employee: mockEmp },
      });
    });

    it("should return error if employee with email already exists", async () => {
      req.body = {
        firstName: "Jane",
        lastName: "Smith",
        email: "existing@test.com",
        role: "scanner",
      };

      (Employee.findOne as jest.Mock).mockResolvedValue(mockEmployee());

      await createVendorEmployee(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Employee with this email already exists",
          statusCode: 400,
        }),
      );
    });

    it("should return error if required fields are missing", async () => {
      req.body = { firstName: "Jane" }; // Missing required fields

      await createVendorEmployee(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("required"),
          statusCode: 400,
        }),
      );
    });
  });

  // ===================== UPDATE VENDOR EMPLOYEE =====================
  describe("updateVendorEmployee", () => {
    it("should update employee successfully", async () => {
      const employeeId = generateObjectId();
      const mockEmp = mockEmployee({ _id: employeeId, vendorId });

      req.params = { id: employeeId };
      req.body = {
        firstName: "Updated",
        status: "inactive",
      };

      const updatedEmp = { ...mockEmp, ...req.body };

      (Employee.findOne as jest.Mock).mockResolvedValue(mockEmp);
      (Employee.findByIdAndUpdate as jest.Mock).mockReturnValue(
        createMockQuery(updatedEmp),
      );
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await updateVendorEmployee(req, res, next);

      expect(Employee.findByIdAndUpdate).toHaveBeenCalledWith(
        employeeId,
        {
          $set: expect.objectContaining({
            firstName: "Updated",
            status: "inactive",
          }),
        },
        { new: true, runValidators: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 if employee not found", async () => {
      req.params = { id: generateObjectId() };
      req.body = { firstName: "Updated" };

      (Employee.findOne as jest.Mock).mockResolvedValue(null);

      await updateVendorEmployee(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Employee not found",
          statusCode: 404,
        }),
      );
    });
  });

  // ===================== DELETE VENDOR EMPLOYEE =====================
  describe("deleteVendorEmployee", () => {
    it("should soft delete employee (status=inactive)", async () => {
      const employeeId = generateObjectId();
      const mockEmp = mockEmployee({ _id: employeeId, vendorId });

      req.params = { id: employeeId };
      req.query = {}; // No hard delete

      const updatedEmp = { ...mockEmp, status: "inactive" };

      (Employee.findOne as jest.Mock).mockResolvedValue(mockEmp);
      (Employee.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedEmp);

      await deleteVendorEmployee(req, res, next);

      expect(Employee.findByIdAndUpdate).toHaveBeenCalledWith(
        employeeId,
        { status: "inactive" },
        { new: true },
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Employee deactivated successfully",
        data: { employee: updatedEmp },
      });
    });

    it("should hard delete employee permanently", async () => {
      const employeeId = generateObjectId();
      const mockEmp = mockEmployee({ _id: employeeId, vendorId });

      req.params = { id: employeeId };
      req.query = { hard: "true" };

      (Employee.findOne as jest.Mock).mockResolvedValue(mockEmp);
      (Employee.findByIdAndDelete as jest.Mock).mockResolvedValue(mockEmp);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await deleteVendorEmployee(req, res, next);

      expect(Employee.findByIdAndDelete).toHaveBeenCalledWith(employeeId);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Employee permanently deleted",
        data: null,
      });
    });
  });

  // ===================== ASSIGN EMPLOYEE TO EVENTS =====================
  describe("assignEmployeeToEvent", () => {
    it("should assign employee to multiple events with transaction", async () => {
      const employeeId = generateObjectId();
      const eventId1 = generateObjectId();
      const eventId2 = generateObjectId();
      const mockEmp = mockEmployee({
        _id: employeeId,
        vendorId,
        assignedEvents: [],
      });
      const mockEvents = [
        mockEvent({ _id: eventId1, vendorId }),
        mockEvent({ _id: eventId2, vendorId }),
      ];

      req.params = { id: employeeId };
      req.body = { eventIds: [eventId1, eventId2] };

      const mockSession = mockMongooseSession();
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (Employee.findOne as jest.Mock).mockResolvedValue({
        ...mockEmp,
        save: jest.fn().mockResolvedValue(undefined),
        assignedEvents: [],
      });
      (Event.find as jest.Mock).mockResolvedValue(mockEvents);
      (Employee.findById as jest.Mock).mockReturnValue(
        createMockQuery({
          ...mockEmp,
          assignedEvents: [eventId1, eventId2],
        }),
      );

      await assignEmployeeToEvent(req, res, next);

      expect(mongoose.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("2 event(s) successfully"),
        }),
      );
    });

    it("should skip already assigned events", async () => {
      const employeeId = generateObjectId();
      const eventId1 = generateObjectId();
      const mockEmp = mockEmployee({
        _id: employeeId,
        vendorId,
        assignedEvents: [eventId1], // Already assigned
      });

      req.params = { id: employeeId };
      req.body = { eventIds: [eventId1] };

      const mockSession = mockMongooseSession();
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (Employee.findOne as jest.Mock).mockResolvedValue(mockEmp);
      (Event.find as jest.Mock).mockResolvedValue([
        mockEvent({ _id: eventId1, vendorId }),
      ]);
      (Employee.findById as jest.Mock).mockReturnValue(
        createMockQuery(mockEmp),
      );

      await assignEmployeeToEvent(req, res, next);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "All events are already assigned to this employee",
        }),
      );
    });

    it("should return error if events not found or not owned by vendor", async () => {
      const employeeId = generateObjectId();
      const eventId1 = generateObjectId();
      const eventId2 = generateObjectId();

      req.params = { id: employeeId };
      req.body = { eventIds: [eventId1, eventId2] };

      const mockSession = mockMongooseSession();
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (Employee.findOne as jest.Mock).mockResolvedValue(
        mockEmployee({ vendorId }),
      );
      (Event.find as jest.Mock).mockResolvedValue([
        mockEvent({ _id: eventId1, vendorId }),
      ]); // Only 1 found

      await assignEmployeeToEvent(req, res, next);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Events not found"),
          statusCode: 404,
        }),
      );
    });

    it("should rollback transaction on error", async () => {
      const employeeId = generateObjectId();
      const eventId1 = generateObjectId();

      req.params = { id: employeeId };
      req.body = { eventIds: [eventId1] };

      const mockSession = mockMongooseSession();
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (Employee.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(assignEmployeeToEvent(req, res, next)).rejects.toThrow(
        "Database error",
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  // ===================== REMOVE EMPLOYEE FROM EVENT =====================
  describe("removeEmployeeFromEvent", () => {
    it("should remove employee from event successfully", async () => {
      const employeeId = generateObjectId();
      const eventId = generateObjectId();
      const mockEmp = {
        ...mockEmployee({ _id: employeeId, vendorId }),
        assignedEvents: [eventId],
        save: jest.fn().mockResolvedValue(undefined),
      };

      req.params = { id: employeeId };
      req.body = { eventId };

      (Employee.findOne as jest.Mock).mockResolvedValue(mockEmp);
      (Employee.findById as jest.Mock).mockReturnValue(
        createMockQuery({
          ...mockEmp,
          assignedEvents: [],
        }),
      );

      await removeEmployeeFromEvent(req, res, next);

      expect(mockEmp.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Employee removed from event successfully",
        data: expect.any(Object),
      });
    });

    it("should return error if eventId not provided", async () => {
      req.params = { id: generateObjectId() };
      req.body = {}; // Missing eventId

      await removeEmployeeFromEvent(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Event ID is required",
          statusCode: 400,
        }),
      );
    });
  });

  // ===================== EXPORT VENDOR EMPLOYEES =====================
  describe("exportVendorEmployees", () => {
    it("should export employees as CSV", async () => {
      const mockEmployees = [
        mockEmployee({ vendorId }),
        mockEmployee({ vendorId }),
      ];

      req.body = { format: "csv", filters: {} };

      (Employee.find as jest.Mock).mockReturnValue(
        createMockQuery(mockEmployees),
      );

      await exportVendorEmployees(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining('attachment; filename="employees-'),
      );
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining("Employee ID"),
      );
    });

    it("should export employees as JSON", async () => {
      const mockEmployees = [mockEmployee({ vendorId })];

      req.body = { format: "json", filters: {} };

      (Employee.find as jest.Mock).mockReturnValue(
        createMockQuery(mockEmployees),
      );

      await exportVendorEmployees(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json",
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEmployees,
        exportedAt: expect.any(Date),
        totalRecords: 1,
      });
    });

    it("should apply filters when exporting", async () => {
      req.body = {
        format: "csv",
        filters: {
          role: "manager",
          status: "active",
        },
      };

      (Employee.find as jest.Mock).mockReturnValue(createMockQuery([]));

      await exportVendorEmployees(req, res, next);

      expect(Employee.find).toHaveBeenCalledWith({
        vendorId,
        role: "manager",
        status: "active",
      });
    });
  });
});
