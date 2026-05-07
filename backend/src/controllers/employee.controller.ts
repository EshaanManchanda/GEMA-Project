import { Request, Response, NextFunction } from "express";
import { Employee, User } from "../models/index";
import { AppError } from "../middleware/error";
import logger from "../config/logger";

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    role,
    permissions,
    assignedEvents,
    assignedVenues,
  } = req.body;
  const vendorId = req.user?._id || req.user?.id; // Assuming the vendor creating the employee is authenticated
  if (!vendorId) {
    return next(new AppError("Unauthorized - vendor ID not found", 401));
  }

  try {
    // Check if a user with this email already exists
    let user = await User.findOne({ email });
    if (user) {
      // If user exists, check if they are already an employee
      const existingEmployee = await Employee.findOne({ userId: user._id });
      if (existingEmployee) {
        return next(
          new AppError("User with this email is already an employee.", 409),
        );
      }
      // If user exists but is not an employee, we can link them
    } else {
      // If user does not exist, create a new user account for the employee
      user = await User.create({
        firstName,
        lastName,
        email,
        role: "employee", // Assign a default 'employee' role in User model
        status: "ACTIVE",
        isEmailVerified: false, // Employee can verify later
      });
    }

    // Generate a unique employee ID (e.g., based on timestamp or UUID)
    const employeeId = `EMP-${Date.now()}`;

    const newEmployee = await Employee.create({
      vendorId,
      userId: user._id,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      role,
      permissions,
      assignedEvents,
      assignedVenues,
      status: "active",
      hiredAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: newEmployee,
    });
  } catch (error) {
    logger.error("Error creating employee:", error);
    next(new AppError("Failed to create employee", 500));
  }
};

export const getEmployeeDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { employeeId } = req.params;
  const vendorId = req.user?._id || req.user?.id; // Assuming authenticated vendor
  if (!vendorId) {
    return next(new AppError("Unauthorized - vendor ID not found", 401));
  }

  try {
    const employee = await Employee.findOne({ _id: employeeId, vendorId })
      .populate("userId", "firstName lastName email")
      .populate("assignedEvents", "name startDate endDate")
      .populate("assignedVenues", "name address");

    if (!employee) {
      return next(
        new AppError(
          "Employee not found or not associated with your vendor account",
          404,
        ),
      );
    }

    res.status(200).json({
      success: true,
      message: "Employee details retrieved successfully",
      data: employee,
    });
  } catch (error) {
    logger.error("Error retrieving employee details:", error);
    next(new AppError("Failed to retrieve employee details", 500));
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { employeeId } = req.params;
  const vendorId = req.user?._id || req.user?.id;
  if (!vendorId) {
    return next(new AppError("Unauthorized - vendor ID not found", 401));
  }
  const updates = req.body;

  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, vendorId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!employee) {
      return next(
        new AppError(
          "Employee not found or not associated with your vendor account",
          404,
        ),
      );
    }

    // If email is updated, also update the associated User model's email
    if (updates.email && employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { email: updates.email });
    }

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    logger.error("Error updating employee:", error);
    next(new AppError("Failed to update employee", 500));
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { employeeId } = req.params;
  const vendorId = req.user?._id || req.user?.id;
  if (!vendorId) {
    return next(new AppError("Unauthorized - vendor ID not found", 401));
  }

  try {
    const employee = await Employee.findOneAndDelete({
      _id: employeeId,
      vendorId,
    });

    if (!employee) {
      return next(
        new AppError(
          "Employee not found or not associated with your vendor account",
          404,
        ),
      );
    }

    // Optionally, delete or deactivate the associated User account as well
    // await User.findByIdAndDelete(employee.userId);

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting employee:", error);
    next(new AppError("Failed to delete employee", 500));
  }
};

export const assignEmployeeToEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { employeeId, eventId } = req.body;
  const vendorId = req.user?._id || req.user?.id;
  if (!vendorId) {
    return next(new AppError("Unauthorized - vendor ID not found", 401));
  }

  try {
    const employee = await Employee.findOne({ _id: employeeId, vendorId });

    if (!employee) {
      return next(
        new AppError(
          "Employee not found or not associated with your vendor account",
          404,
        ),
      );
    }

    if (!employee.assignedEvents.includes(eventId)) {
      employee.assignedEvents.push(eventId);
      await employee.save();
    }

    res.status(200).json({
      success: true,
      message: "Employee assigned to event successfully",
      data: employee,
    });
  } catch (error) {
    logger.error("Error assigning employee to event:", error);
    next(new AppError("Failed to assign employee to event", 500));
  }
};

export const removeEmployeeFromEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { employeeId, eventId } = req.body;
  const vendorId = req.user?._id || req.user?.id;
  if (!vendorId) {
    return next(new AppError("Unauthorized - vendor ID not found", 401));
  }

  try {
    const employee = await Employee.findOne({ _id: employeeId, vendorId });

    if (!employee) {
      return next(
        new AppError(
          "Employee not found or not associated with your vendor account",
          404,
        ),
      );
    }

    employee.assignedEvents = employee.assignedEvents.filter(
      (id) => id.toString() !== eventId,
    );
    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee removed from event successfully",
      data: employee,
    });
  } catch (error) {
    logger.error("Error removing employee from event:", error);
    next(new AppError("Failed to remove employee from event", 500));
  }
};
