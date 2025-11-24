import { Request, Response, NextFunction } from 'express';
import Employee, { IEmployee } from '../models/Employee';
import { User, UserRole, UserStatus } from '../models';
import { AppError } from '../middleware/index';
import { ApiResponse } from '../types';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Interface for employee query parameters
 */
interface EmployeeQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  vendorId?: string;
  role?: 'manager' | 'scanner' | 'coordinator' | 'security';
  status?: 'active' | 'inactive' | 'suspended';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for employee creation request
 */
interface CreateEmployeeRequest {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;

  // Vendor Assignment
  vendorId: string;

  // Employee Details
  role: 'manager' | 'scanner' | 'coordinator' | 'security';
  permissions?: Array<{
    action: string;
    scope: 'all' | 'assigned';
  }>;
  status?: 'active' | 'inactive' | 'suspended';

  // Additional Info
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
}

/**
 * Interface for employee update request
 */
interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  vendorId?: string;
  role?: 'manager' | 'scanner' | 'coordinator' | 'security';
  permissions?: Array<{
    action: string;
    scope: 'all' | 'assigned';
  }>;
  status?: 'active' | 'inactive' | 'suspended';
  assignedEvents?: mongoose.Types.ObjectId[];
  assignedVenues?: mongoose.Types.ObjectId[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
}

/**
 * Format employee for admin response
 */
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
    vendorId: employee.vendorId?._id?.toString() || employee.vendorId?.toString(),
    vendor: employee.vendorId?.businessName ? {
      id: employee.vendorId._id?.toString(),
      businessName: employee.vendorId.businessName,
      contactEmail: employee.vendorId.contactEmail
    } : null,
    userId: employee.userId?._id?.toString() || employee.userId?.toString(),
    user: employee.userId?.email ? {
      id: employee.userId._id?.toString(),
      email: employee.userId.email,
      status: employee.userId.status
    } : null,
    createdAt: typeof employee.createdAt === 'string' ? employee.createdAt : employee.createdAt?.toISOString(),
    updatedAt: typeof employee.updatedAt === 'string' ? employee.updatedAt : employee.updatedAt?.toISOString()
  };
};

/**
 * Get all employees with pagination and filtering (Admin only - cross-vendor)
 */
export const getAllEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      vendorId,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as EmployeeQueryParams;

    // Build query
    const query: any = {};

    // Search functionality (searches firstName, lastName, email, employeeId)
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by vendor
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      query.vendorId = vendorId;
    }

    // Filter by role
    if (role && ['manager', 'scanner', 'coordinator', 'security'].includes(role)) {
      query.role = role;
    }

    // Filter by status
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with population
    const [employees, totalEmployees] = await Promise.all([
      Employee.find(query)
        .populate('vendorId', 'businessName contactEmail')
        .populate('userId', 'email status')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Employee.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalEmployees / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response
    const formattedEmployees = employees.map(employee => formatAdminEmployeeResponse(employee));

    const response: ApiResponse = {
      success: true,
      message: 'Employees retrieved successfully',
      data: {
        employees: formattedEmployees,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEmployees,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
        },
        filters: {
          search,
          vendorId,
          role,
          status,
          sortBy,
          sortOrder
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee statistics (Admin only)
 */
export const getEmployeeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      employeesByRole,
      employeesByStatus,
      employeesByVendor,
      recentEmployees
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Employee.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Employee.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Employee.aggregate([
        {
          $group: {
            _id: '$vendorId',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: '_id',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        {
          $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            vendorId: '$_id',
            vendorName: '$vendor.businessName',
            count: 1
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Employee.find()
        .populate('vendorId', 'businessName')
        .populate('userId', 'email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Employee statistics retrieved successfully',
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        employeesByRole: employeesByRole.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        employeesByStatus: employeesByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        employeesByVendor: employeesByVendor.map(item => ({
          vendorId: item.vendorId?.toString(),
          vendorName: item.vendorName || 'Unknown',
          count: item.count
        })),
        recentEmployees: recentEmployees.map(employee => formatAdminEmployeeResponse(employee))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee by ID with full details
 */
export const getEmployeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid employee ID', 400));
    }

    const employee = await Employee.findById(id)
      .populate('vendorId', 'businessName contactEmail contactPhone location')
      .populate('userId', 'email status lastLogin')
      .populate('assignedEvents', 'title startDate endDate')
      .populate('assignedVenues', 'name location')
      .lean();

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Employee retrieved successfully',
      data: {
        employee: formatAdminEmployeeResponse(employee)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new employee (Admin only - can assign to any vendor)
 */
export const createEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      status = 'active',
      emergencyContact,
      hiredAt
    } = req.body as CreateEmployeeRequest;

    // Validate required fields
    if (!firstName || !lastName || !email || !vendorId || !role) {
      return next(new AppError('First name, last name, email, vendor, and role are required', 400));
    }

    // Validate vendor ID
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    // Check if vendor exists
    const Vendor = require('../models/Vendor').default;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return next(new AppError('Employee with this email already exists', 409));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 409));
    }

    // Clean up phone field
    const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : undefined;

    // Generate password if not provided
    const defaultPassword = password && password.trim() !== '' ? password.trim() : 'TempPass123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    // Create user account first
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      phone: cleanPhone,
      role: UserRole.EMPLOYEE,
      status: status === 'active' ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      isEmailVerified: false,
      isPhoneVerified: false
    });

    // Generate employee ID
    const employeeId = `EMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    // Create employee record
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
      hiredAt: hiredAt ? new Date(hiredAt) : new Date()
    });

    // Populate vendor and user info
    await employee.populate('vendorId', 'businessName contactEmail');
    await employee.populate('userId', 'email status');

    const response: ApiResponse = {
      success: true,
      message: 'Employee created successfully',
      data: {
        employee: formatAdminEmployeeResponse(employee)
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update employee (Admin only)
 */
export const updateEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateEmployeeRequest;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid employee ID', 400));
    }

    // Check if employee exists
    const employee = await Employee.findById(id);
    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    // Check if email is being updated and if it's already taken
    if (updateData.email && updateData.email !== employee.email) {
      const existingEmployee = await Employee.findOne({ email: updateData.email });
      if (existingEmployee) {
        return next(new AppError('Email already exists', 409));
      }
    }

    // Validate vendor ID if being updated
    if (updateData.vendorId && !mongoose.Types.ObjectId.isValid(updateData.vendorId)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    // Clean up phone field
    if ('phone' in updateData) {
      updateData.phone = updateData.phone && updateData.phone.trim() !== '' ? updateData.phone.trim() : undefined;
    }

    // Convert hiredAt string to Date if provided
    if ('hiredAt' in updateData && updateData.hiredAt) {
      updateData.hiredAt = new Date(updateData.hiredAt as any);
    }

    // Update employee
    Object.assign(employee, updateData);
    await employee.save();

    // Also update the related user account if basic info changed
    if (updateData.firstName || updateData.lastName || updateData.email || updateData.phone !== undefined || updateData.status) {
      const userUpdateData: any = {};
      if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      if (updateData.email) userUpdateData.email = updateData.email;
      if (updateData.phone !== undefined) userUpdateData.phone = updateData.phone;
      if (updateData.status) {
        userUpdateData.status = updateData.status === 'active' ? UserStatus.ACTIVE : UserStatus.INACTIVE;
      }

      await User.findByIdAndUpdate(employee.userId, userUpdateData);
    }

    // Populate vendor and user info
    await employee.populate('vendorId', 'businessName contactEmail');
    await employee.populate('userId', 'email status');

    const response: ApiResponse = {
      success: true,
      message: 'Employee updated successfully',
      data: {
        employee: formatAdminEmployeeResponse(employee)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete employee (Admin only)
 */
export const deleteEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid employee ID', 400));
    }

    // Check if employee exists
    const employee = await Employee.findById(id);
    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    // Delete employee
    await Employee.findByIdAndDelete(id);

    // Optionally delete or deactivate the associated user account
    // For now, we'll just deactivate it
    await User.findByIdAndUpdate(employee.userId, {
      status: UserStatus.INACTIVE
    });

    const response: ApiResponse = {
      success: true,
      message: 'Employee deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update employees (Admin only)
 */
export const bulkUpdateEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeIds, updateData } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return next(new AppError('Employee IDs array is required', 400));
    }

    // Validate all employee IDs
    const invalidIds = employeeIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(new AppError('Invalid employee IDs found', 400));
    }

    // Prepare update data (only allow certain fields for bulk update)
    const allowedFields = ['status', 'role'];
    const bulkUpdateData: any = {};

    for (const field of allowedFields) {
      if (field in updateData) {
        bulkUpdateData[field] = updateData[field];
      }
    }

    if (Object.keys(bulkUpdateData).length === 0) {
      return next(new AppError('No valid fields to update', 400));
    }

    // Update employees
    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      bulkUpdateData,
      { runValidators: true }
    );

    // If status is being updated, also update the associated user accounts
    if (bulkUpdateData.status) {
      const employees = await Employee.find({ _id: { $in: employeeIds } }).select('userId');
      const userIds = employees.map(emp => emp.userId);

      await User.updateMany(
        { _id: { $in: userIds } },
        { status: bulkUpdateData.status === 'active' ? UserStatus.ACTIVE : UserStatus.INACTIVE }
      );
    }

    const response: ApiResponse = {
      success: true,
      message: `${result.modifiedCount} employees updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
