import { Request, Response } from "express";
import WinterCampRegistration, {
  WinterCampStatus,
} from "../models/WinterCampRegistration";
import logger from "../config/logger";

/**
 * Public: Register interest for winter camp
 * POST /api/winter-camp/register
 */
export const registerWinterCamp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentName,
      studentEmail,
      parentEmail,
      parentPhone,
      grade,
      selectedPrograms,
      interests,
      message,
    } = req.body;

    if (!studentName || !studentEmail || !parentEmail || !grade) {
      res.status(400).json({
        success: false,
        message: "Student name, student email, parent email, and grade are required.",
      });
      return;
    }

    const registration = await WinterCampRegistration.create({
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim().toLowerCase(),
      parentEmail: parentEmail.trim().toLowerCase(),
      parentPhone: parentPhone ? parentPhone.trim() : undefined,
      grade: grade.trim(),
      selectedPrograms: Array.isArray(selectedPrograms) ? selectedPrograms : [],
      interests: Array.isArray(interests) ? interests : [],
      message: message ? message.trim() : undefined,
      status: WinterCampStatus.PENDING,
    });

    res.status(201).json({
      success: true,
      message: "Registration submitted successfully! Our team will contact you soon.",
      data: registration,
    });
  } catch (error: any) {
    logger.error("Error in registerWinterCamp:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit winter camp registration. Please try again.",
      error: error.message,
    });
  }
};

/**
 * Admin: Get all winter camp registrations
 * GET /api/winter-camp/registrations
 */
export const getWinterCampRegistrations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const status = req.query.status as string;
    const search = req.query.search as string;

    const filter: any = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { studentName: { $regex: q, $options: "i" } },
        { studentEmail: { $regex: q, $options: "i" } },
        { parentEmail: { $regex: q, $options: "i" } },
        { parentPhone: { $regex: q, $options: "i" } },
        { grade: { $regex: q, $options: "i" } },
        { selectedPrograms: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      WinterCampRegistration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WinterCampRegistration.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        registrations,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error("Error in getWinterCampRegistrations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch registrations",
      error: error.message,
    });
  }
};

/**
 * Admin: Update registration status or notes
 * PATCH /api/winter-camp/registrations/:id/status
 */
export const updateWinterCampStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const update: any = {};
    if (status && Object.values(WinterCampStatus).includes(status)) {
      update.status = status;
    }
    if (typeof notes === "string") {
      update.notes = notes;
    }

    const updated = await WinterCampRegistration.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Registration not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Registration updated successfully",
      data: updated,
    });
  } catch (error: any) {
    logger.error("Error in updateWinterCampStatus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update registration",
      error: error.message,
    });
  }
};

/**
 * Admin: Delete a registration
 * DELETE /api/winter-camp/registrations/:id
 */
export const deleteWinterCampRegistration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await WinterCampRegistration.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Registration not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Registration deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error in deleteWinterCampRegistration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete registration",
      error: error.message,
    });
  }
};

