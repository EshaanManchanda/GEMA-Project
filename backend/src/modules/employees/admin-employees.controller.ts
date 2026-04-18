import { Request, Response, NextFunction } from "express";
import Employee, { IEmployee } from "./employee.model";
import { User, UserRole, UserStatus } from "../../models/index";
import { AppError } from "../../middleware/index";
import { ApiResponse } from "../../types/index";
import * as bcrypt from "bcryptjs";
import mongoose from "mongoose";

interface EmployeeQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  vendorId?: string;
  role?: "manager" | "scanner" | "coordinator" | "security";
  status?: "active" | "inactive" | "suspended";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  vendorId: string;
  role: "manager" | "scanner" | "coordinator" | "security";
  permissions?: Array<{
    action: string;
    scope: "all" | "assigned";
  }>;
  status?: "active" | "inactive" | "suspended";
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
}

interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  vendorId?: string;
  role?: "manager" | "scanner" | "coordinator" | "security";
  permissions?: Array<{
    action: string;
    scope: "all" | "assigned";
  }>;
  status?: "active" | "inactive" | "suspended";
  assignedEvents?: mongoose.Types.ObjectId[];
  assignedVenues?: mongoose.Types.ObjectId[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
}

const formatAdminEmployeeResponse = (employee: any) => {
  return {
    id: employee._id?.toString() || employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    status: employee.status,
    permissions: employee.permissions || [],
    assignedEvents: employee.assignedEvents || [],
    assignedVenues: employee.assignedVenues || [],
    shiftSchedule: employee.shiftSchedule || [],
    deviceAccess: employee.deviceAccess || [],
    scanHistory: employee.scanHistory || [],
    emergencyContact: employee.emergencyContact,
    hiredAt: employee.hiredAt,
    vendorId:
      employee.vendorId?._id?.toString() || employee.vendorId?.toString(),
    vendor: employee.vendorId?.businessName
      ? {
          id: employee.vendorId._id?.toString(),
          businessName: employee.vendorId.businessName,
          contactEmail: employee.vendorId.contactEmail,
        }
      : null,
    userId: employee.userId?._id?.toString() || employee.userId?.toString(),
    user: employee.userId?.email
      ? {
          id: employee.userId._id?.toString(),
          email: employee.userId.email,
          status: employee.userId.status,
        }
      : null,
    createdAt:
      typeof employee.createdAt === "string"
        ? employee.createdAt
        : employee.createdAt?.toISOString(),
    updatedAt:
      typeof employee.updatedAt === "string"
        ? employee.updatedAt
        : employee.updatedAt?.toISOString(),
  };
};

export const getAllEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "20",
      search,
      vendorId,
      role,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as EmployeeQueryParams;

    const query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      query.vendorId = vendorId;
    }

    if (
      role &&
      ["manager", "scanner", "coordinator", "security"].includes(role)
    ) {
      query.role = role;
    }

    if (status && ["active", "inactive", "suspended"].includes(status)) {
      query.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [employees, totalEmployees] = await Promise.all([
      Employee.find(query)
        .populate("vendorId", "businessName contactEmail")
        .populate("userId", "email status")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Employee.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalEmployees / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const formattedEmployees = employees.map((employee) =>
      formatAdminEmployeeResponse(employee),
    );

    const response: ApiResponse = {
      success: true,
      message: "Employees retrieved successfully",
      data: {
        employees: formattedEmployees,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEmployees,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
        filters: {
          search,
          vendorId,
          role,
          status,
          sortBy,
          sortOrder,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      employeesByRole,
      employeesByStatus,
      employeesByVendor,
      recentEmployees,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: "active" }),
      Employee.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Employee.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Employee.aggregate([
        {
          $group: {
            _id: "$vendorId",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "vendors",
            localField: "_id",
            foreignField: "_id",
            as: "vendor",
          },
        },
        {
          $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            vendorId: "$_id",
            vendorName: "$vendor.businessName",
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Employee.find()
        .populate("vendorId", "businessName")
        .populate("userId", "email")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Employee statistics retrieved successfully",
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        employeesByRole: employeesByRole.reduce(
          (acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        employeesByStatus: employeesByStatus.reduce(
          (acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        employeesByVendor: employeesByVendor.map((item) => ({
          vendorId: item.vendorId?.toString(),
          vendorName: item.vendorName || "Unknown",
          count: item.count,
        })),
        recentEmployees: recentEmployees.map((employee) =>
          formatAdminEmployeeResponse(employee),
        ),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid employee ID", 400));
    }

    const employee = await Employee.findById(id)
      .populate("vendorId", "businessName contactEmail contactPhone location")
      .populate("userId", "email status lastLogin")
      .populate("assignedEvents", "title startDate endDate")
      .populate("assignedVenues", "name location")
      .lean();

    if (!employee) {
      return next(new AppError("Employee not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Employee retrieved successfully",
      data: {
        employee: formatAdminEmployeeResponse(employee),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      vendorId,
      role,
      permissions = [],
      status = "active",
      emergencyContact,
      hiredAt,
    } = req.body as CreateEmployeeRequest;

    if (!firstName || !lastName || !email || !vendorId || !role) {
      return next(
        new AppError(
          "First name, last name, email, vendor, and role are required",
          400,
        ),
      );
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const Vendor = require("../../models/Vendor").default;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return next(new AppError("Employee with this email already exists", 409));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("User with this email already exists", 409));
    }

    const cleanPhone = phone && phone.trim() !== "" ? phone.trim() : undefined;

    const defaultPassword =
      password && password.trim() !== "" ? password.trim() : "TempPass123!";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      phone: cleanPhone,
      role: UserRole.EMPLOYEE,
      status: status === "active" ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    const employeeId = `EMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

    const employee = await Employee.create({
      vendorId,
      userId: user._id,
      employeeId,
      firstName,
      lastName,
      email,
      phone: cleanPhone,
      role,
      permissions,
      assignedEvents: [],
      assignedVenues: [],
      status,
      emergencyContact: emergencyContact || undefined,
      hiredAt: hiredAt ? new Date(hiredAt) : new Date(),
    });

    await employee.populate("vendorId", "businessName contactEmail");
    await employee.populate("userId", "email status");

    const response: ApiResponse = {
      success: true,
      message: "Employee created successfully",
      data: {
        employee: formatAdminEmployeeResponse(employee),
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateEmployeeRequest;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid employee ID", 400));
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return next(new AppError("Employee not found", 404));
    }

    if (updateData.email && updateData.email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        email: updateData.email,
      });
      if (existingEmployee) {
        return next(new AppError("Email already exists", 409));
      }
    }

    if (
      updateData.vendorId &&
      !mongoose.Types.ObjectId.isValid(updateData.vendorId)
    ) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    if ("phone" in updateData) {
      updateData.phone =
        updateData.phone && updateData.phone.trim() !== ""
          ? updateData.phone.trim()
          : undefined;
    }

    if ("hiredAt" in updateData && updateData.hiredAt) {
      updateData.hiredAt = new Date(updateData.hiredAt as any);
    }

    Object.assign(employee, updateData);
    await employee.save();

    if (
      updateData.firstName ||
      updateData.lastName ||
      updateData.email ||
      updateData.phone !== undefined ||
      updateData.status
    ) {
      const userUpdateData: any = {};
      if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      if (updateData.email) userUpdateData.email = updateData.email;
      if (updateData.phone !== undefined)
        userUpdateData.phone = updateData.phone;
      if (updateData.status) {
        userUpdateData.status =
          updateData.status === "active"
            ? UserStatus.ACTIVE
            : UserStatus.INACTIVE;
      }

      await User.findByIdAndUpdate(employee.userId, userUpdateData);
    }

    await employee.populate("vendorId", "businessName contactEmail");
    await employee.populate("userId", "email status");

    const response: ApiResponse = {
      success: true,
      message: "Employee updated successfully",
      data: {
        employee: formatAdminEmployeeResponse(employee),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid employee ID", 400));
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return next(new AppError("Employee not found", 404));
    }

    await Employee.findByIdAndDelete(id);

    await User.findByIdAndUpdate(employee.userId, {
      status: UserStatus.INACTIVE,
    });

    const response: ApiResponse = {
      success: true,
      message: "Employee deleted successfully",
      data: null,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { employeeIds, updateData } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return next(new AppError("Employee IDs array is required", 400));
    }

    const invalidIds = employeeIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidIds.length > 0) {
      return next(new AppError("Invalid employee IDs found", 400));
    }

    const allowedFields = ["status", "role"];
    const bulkUpdateData: any = {};

    for (const field of allowedFields) {
      if (field in updateData) {
        bulkUpdateData[field] = updateData[field];
      }
    }

    if (Object.keys(bulkUpdateData).length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      bulkUpdateData,
      { runValidators: true },
    );

    if (bulkUpdateData.status) {
      const employees = await Employee.find({
        _id: { $in: employeeIds },
      }).select("userId");
      const userIds = employees.map((emp) => emp.userId);

      await User.updateMany(
        { _id: { $in: userIds } },
        {
          status:
            bulkUpdateData.status === "active"
              ? UserStatus.ACTIVE
              : UserStatus.INACTIVE,
        },
      );
    }

    const response: ApiResponse = {
      success: true,
      message: `${result.modifiedCount} employees updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
