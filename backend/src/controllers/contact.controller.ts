import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/express.d";
import Contact from "../models/Contact";
import { emailService } from "../services/email.service";
import { AppError } from "../middleware/error";
import logger from "../config/logger";

/**
 * Submit contact form (public endpoint)
 */
export const submitContact = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, subject, message } = req.body;

    // Create contact record in database
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      status: "new",
    });

    await contact.save();

    // Send email notification to support team
    try {
      await emailService.sendContactNotification({
        name,
        email,
        subject,
        message,
        submittedAt: contact.createdAt,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      logger.error("Failed to send contact notification email:", emailError);
      // Continue anyway as the contact was saved to database
    }

    res.status(201).json({
      success: true,
      message:
        "Thank you for contacting us! We will get back to you as soon as possible.",
      data: {
        contact: {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          submittedAt: contact.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all contact submissions (admin only)
 */
export const getAllContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const {
      page = 1,
      limit = 20,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Parse pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [contacts, totalCount] = await Promise.all([
      Contact.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Contact.countDocuments(query),
    ]);

    // Get statistics
    const stats = await Contact.getContactStats();

    res.status(200).json({
      success: true,
      message: "Contact submissions retrieved successfully",
      data: {
        contacts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1,
        },
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single contact submission by ID (admin only)
 */
export const getContactById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const { id } = req.params;

    const contact = await Contact.findById(id);

    if (!contact) {
      return next(new AppError("Contact submission not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Contact submission retrieved successfully",
      data: { contact },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark contact as read (admin only)
 */
export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const { id } = req.params;

    const contact = await Contact.findById(id);

    if (!contact) {
      return next(new AppError("Contact submission not found", 404));
    }

    // Update status to read if it's new
    if (contact.status === "new") {
      contact.status = "read";
      contact.readAt = new Date();
      await contact.save();
    }

    res.status(200).json({
      success: true,
      message: "Contact marked as read",
      data: { contact },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark contact as responded (admin only)
 */
export const markAsResponded = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const { id } = req.params;
    const { notes } = req.body;

    const contact = await Contact.findById(id);

    if (!contact) {
      return next(new AppError("Contact submission not found", 404));
    }

    // Update status to responded
    contact.status = "responded";
    contact.respondedAt = new Date();

    if (notes) {
      contact.notes = notes;
    }

    // Also mark as read if not already
    if (!contact.readAt) {
      contact.readAt = new Date();
    }

    await contact.save();

    res.status(200).json({
      success: true,
      message: "Contact marked as responded",
      data: { contact },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete contact submission (admin only)
 */
export const deleteContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return next(new AppError("Contact submission not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Contact submission deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contact statistics (admin only)
 */
export const getContactStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const stats = await Contact.getContactStats();

    res.status(200).json({
      success: true,
      message: "Contact statistics retrieved successfully",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};
