import { Request, Response, NextFunction } from 'express';
import { User, UserRole, UserStatus, IUser } from '../models';
import { AppError } from '../middleware';
import { ApiResponse } from '../types';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Interface for user creation request
 */
interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

/**
 * Interface for user update request
 */
interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  avatar?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

/**
 * Interface for user query parameters
 */
interface UserQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Format user for admin response (includes more sensitive information)
 */
const formatAdminUserResponse = (user: any) => {
  return {
    id: user._id?.toString() || user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    lastLogin: user.lastLogin,
    loginAttempts: user.loginAttempts?.length || 0,
    createdAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt?.toISOString(),
    updatedAt: typeof user.updatedAt === 'string' ? user.updatedAt : user.updatedAt?.toISOString()
  };
};

/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as UserQueryParams;

    // Build query
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role && Object.values(UserRole).includes(role)) {
      query.role = role;
    }

    // Filter by status
    if (status && Object.values(UserStatus).includes(status)) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response
    const formattedUsers = users.map(user => formatAdminUserResponse(user as IUser));

    const response: ApiResponse = {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: formattedUsers,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
        },
        filters: {
          search,
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
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid user ID', 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: formatAdminUserResponse(user)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role = UserRole.CUSTOMER,
      status = UserStatus.ACTIVE,
      avatar,
      isEmailVerified = false,
      isPhoneVerified = false
    } = req.body as CreateUserRequest;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return next(new AppError('First name, last name, and email are required', 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 409));
    }

    // Clean up phone field - convert empty string to undefined
    const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : undefined;

    // Generate password if not provided
    let passwordHash = '';
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } else {
      // Generate a default password if none provided
      const defaultPassword = 'TempPass123!';
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(defaultPassword, salt);
    }

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash,
      phone: cleanPhone,
      role,
      status,
      avatar,
      isEmailVerified,
      isPhoneVerified
    });

    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'User created successfully',
      data: {
        user: formatAdminUserResponse(user)
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateUserRequest;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid user ID', 400));
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if email is being updated and if it's already taken
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return next(new AppError('Email already exists', 409));
      }
    }

    // Clean up phone field - convert empty string to undefined
    if ('phone' in updateData) {
      updateData.phone = updateData.phone && updateData.phone.trim() !== '' ? updateData.phone.trim() : undefined;
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: {
        user: formatAdminUserResponse(user)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid user ID', 400));
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Note: Admin can delete other admin users if needed
    // Add any additional business logic here if required

    // Delete user
    await User.findByIdAndDelete(id);

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user status
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid user ID', 400));
    }

    // Validate status
    if (!Object.values(UserStatus).includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'User status updated successfully',
      data: {
        user: formatAdminUserResponse(user)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role
 */
export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid user ID', 400));
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    // Update user role
    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'User role updated successfully',
      data: {
        user: formatAdminUserResponse(user)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update users
 */
export const bulkUpdateUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userIds, updateData } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return next(new AppError('User IDs array is required', 400));
    }

    // Validate all user IDs
    const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(new AppError('Invalid user IDs found', 400));
    }

    // Update users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData,
      { runValidators: true }
    );

    const response: ApiResponse = {
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
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

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      usersByStatus,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: UserStatus.ACTIVE }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        totalUsers,
        activeUsers,
        usersByRole: usersByRole.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        usersByStatus: usersByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recentUsers: recentUsers.map(user => formatAdminUserResponse(user as IUser))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};