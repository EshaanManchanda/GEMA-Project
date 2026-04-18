import mongoose from "mongoose";
import School from "./school.model";
import SchoolInvite from "./school-invite.model";
import { AppError, catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";
import { Response, NextFunction } from "express";
import crypto from "crypto";

export interface CreateSchoolInput {
  schoolName: string;
  schoolType: string;
  description?: string;
  email: string;
  phone: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  curriculum?: string[];
  gradeLevels?: string[];
  principalName?: string;
}

export interface UpdateSchoolInput {
  schoolName?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  website?: string;
  address?: Partial<CreateSchoolInput["address"]>;
  curriculum?: string[];
  gradeLevels?: string[];
  principalName?: string;
  settings?: Partial<{
    allowTeacherSelfRegistration: boolean;
    requireParentApprovalForBookings: boolean;
    autoGenerateCertificates: boolean;
    enableLMS: boolean;
    enableERP: boolean;
  }>;
}

class SchoolService {
  async createSchool(userId: string, input: CreateSchoolInput) {
    const slug = input.schoolName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const existing = await School.findOne({ slug });
    if (existing) {
      throw new AppError("A school with this name already exists", 400);
    }

    const school = await School.create({
      ...input,
      userId,
      slug,
      memberSince: new Date(),
    });

    return school;
  }

  async getSchoolById(id: string) {
    const school = await School.findById(id).populate("userId", "firstName lastName email");
    if (!school) throw new AppError("School not found", 404);
    return school;
  }

  async getAllSchools(query: any) {
    const { page = 1, limit = 20, search, schoolType, verificationStatus, city, country } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { isActive: true };
    if (search) filter.schoolName = { $regex: search, $options: "i" };
    if (schoolType) filter.schoolType = schoolType;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (city) filter["address.city"] = { $regex: city, $options: "i" };
    if (country) filter["address.country"] = { $regex: country, $options: "i" };

    const [schools, total] = await Promise.all([
      School.find(filter).populate("userId", "firstName lastName email").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      School.countDocuments(filter),
    ]);

    return {
      schools,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalSchools: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    };
  }

  async updateSchool(id: string, input: UpdateSchoolInput) {
    const school = await School.findById(id);
    if (!school) throw new AppError("School not found", 404);

    Object.assign(school, input);

    if (input.schoolName) {
      school.slug = input.schoolName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }

    await school.save();
    return school;
  }

  async moderateSchool(id: string, action: "approve" | "reject" | "suspend" | "unsuspend") {
    const school = await School.findById(id);
    if (!school) throw new AppError("School not found", 404);

    switch (action) {
      case "approve":
        school.verificationStatus = "verified" as any;
        school.isActive = true;
        break;
      case "reject":
        school.verificationStatus = "rejected" as any;
        break;
      case "suspend":
        school.isSuspended = true;
        school.isActive = false;
        break;
      case "unsuspend":
        school.isSuspended = false;
        school.isActive = true;
        break;
    }

    await school.save();
    return school;
  }

  async deleteSchool(id: string) {
    const school = await School.findById(id);
    if (!school) throw new AppError("School not found", 404);
    school.isActive = false;
    await school.save();
    return school;
  }

  async inviteUser(schoolId: string, invitedBy: string, email: string, role: string, metadata?: any) {
    const school = await School.findById(schoolId);
    if (!school) throw new AppError("School not found", 404);

    const existingInvite = await SchoolInvite.findOne({ email, role, acceptedAt: { $exists: false } });
    if (existingInvite) throw new AppError("An invitation already exists for this email", 400);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await SchoolInvite.create({
      schoolId,
      email,
      role,
      token,
      expiresAt,
      invitedBy,
      metadata,
    });

    return invite;
  }

  async getInvites(schoolId: string) {
    return SchoolInvite.find({ schoolId, acceptedAt: { $exists: false } })
      .populate("invitedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await SchoolInvite.findOne({ token, acceptedAt: { $exists: false } });
    if (!invite) throw new AppError("Invalid or expired invitation", 404);
    if (invite.expiresAt < new Date()) throw new AppError("Invitation has expired", 400);

    invite.acceptedAt = new Date();
    invite.acceptedBy = new mongoose.Types.ObjectId(userId);
    await invite.save();

    return invite;
  }

  async getSchoolStats(schoolId: string) {
    const school = await School.findById(schoolId);
    if (!school) throw new AppError("School not found", 404);
    return school.stats;
  }
}

export const schoolService = new SchoolService();
