import { Request, Response, NextFunction } from "express";
import { catchAsync, AppError } from "../middleware/index";
import NationalDaySubmission, {
  INationalDaySubmission,
  RegistrationType,
  SubmissionStatus,
} from "../models/NationalDaySubmission";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import { config } from "../config/env";
import logger from "../config/logger";
import uploadService from "../services/upload.service";
import { emailService } from "../services/email.service";
import fs from "fs";
import { stripe } from "../config/stripe";
import { AuthRequest } from "../types";
import { certificateService } from "../modules/certificates/services/certificate.service";

// Helper: map grade string to category
export const getCategoryFromGrade = (grade: string): string => {
  if (!grade) return "Little Artists";
  const normalized = grade.toLowerCase();
  if (normalized.includes("kindergarten") || normalized.includes("kg") || normalized.includes("grade 1") || normalized.includes("grade 2")) {
    return "Little Artists";
  }
  if (normalized.includes("grade 3") || normalized.includes("grade 4") || normalized.includes("grade 5")) {
    return "Young Creators";
  }
  if (normalized.includes("grade 6") || normalized.includes("grade 7") || normalized.includes("grade 8")) {
    return "Creative Visionaries";
  }
  return "Emerging Artists";
};

// ─── Save Draft Submission ───────────────────────────────────────────────────

export const saveDraftSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const artworkFile = files?.["artwork"]?.[0];

    if (!artworkFile) {
      return next(new AppError("Artwork file is required", 400));
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedMimes.includes(artworkFile.mimetype)) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Only JPG, PNG and WEBP files are accepted for artwork", 400));
    }

    const MAX_ARTWORK_SIZE = 10 * 1024 * 1024;
    if (artworkFile.size > MAX_ARTWORK_SIZE) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Artwork file must be 10 MB or less", 400));
    }

    const body = req.body;

    // Upload artwork to Cloudinary
    let artworkUrl = "";
    let artworkPublicId = "";

    try {
      if ((artworkFile as any).path?.startsWith("http") || (artworkFile as any).secure_url) {
        artworkUrl = (artworkFile as any).secure_url || (artworkFile as any).path;
        artworkPublicId = (artworkFile as any).public_id || (artworkFile as any).filename || "";
      } else if (artworkFile.path) {
        const uploadResult = await uploadService.uploadToCloudinary(artworkFile.path, {
          folder: "gema/national-day-competition-2026",
          resourceType: "image",
        });

        if (!uploadResult.success || !uploadResult.url) {
          return next(new AppError("Failed to upload artwork. Please try again.", 500));
        }

        artworkUrl = uploadResult.url;
        artworkPublicId = uploadResult.publicId || "";

        if (fs.existsSync(artworkFile.path)) {
          fs.unlinkSync(artworkFile.path);
        }
      } else {
        return next(new AppError("Failed to process artwork file", 500));
      }
    } catch (uploadError) {
      logger.error("[national-day] Cloudinary artwork upload failed:", uploadError);
      return next(new AppError("Failed to upload artwork. Please try again.", 500));
    }

    const regType = body.registrationType === "school_bulk" 
      ? RegistrationType.SCHOOL_BULK 
      : RegistrationType.INDIVIDUAL;
      
    const feeAmount = regType === RegistrationType.SCHOOL_BULK ? 25 : 35;
    const category = body.category || getCategoryFromGrade(body.grade);

    const submission = new NationalDaySubmission({
      registrationType: regType,
      participant: {
        parentName: body.parentName?.trim(),
        parentEmail: body.parentEmail?.trim()?.toLowerCase(),
        parentPhone: body.parentPhone?.trim(),
        studentFullName: body.studentFullName?.trim(),
        studentAge: Number(body.studentAge),
        grade: body.grade,
        category,
        gender: body.gender || undefined,
        schoolName: body.schoolName?.trim(),
        schoolEmirate: body.schoolEmirate,
      },
      artwork: {
        title: body.artworkTitle?.trim(),
        description: body.artworkDescription?.trim(),
        medium: body.medium?.trim() || "Pencil / Drawing",
        themePillar: body.themePillar?.trim() || "Heritage & Traditions",
      },
      artworkUpload: {
        artworkUrl,
        artworkPublicId,
        artworkOriginalName: artworkFile.originalname,
        artworkSize: artworkFile.size,
        artworkMimetype: artworkFile.mimetype,
      },
      declarations: {
        agreeTerms: body.agreeTerms === "true" || body.agreeTerms === true,
        traditionalOnlyDeclaration: body.traditionalOnlyDeclaration === "true" || body.traditionalOnlyDeclaration === true,
        originalityDeclaration: body.originalityDeclaration === "true" || body.originalityDeclaration === true,
      },
      consent: {
        parentGuardianConsent: body.parentGuardianConsent === "true" || body.parentGuardianConsent === true,
        artworkDisplayPermission: body.artworkDisplayPermission === "no" ? "no" : "yes",
        nameDisplayPermission: body.nameDisplayPermission === "false" ? false : true,
        competitionUpdatesConsent: body.competitionUpdatesConsent === "true" || body.competitionUpdatesConsent === true,
        marketingConsent: body.marketingConsent === "true" || body.marketingConsent === true,
      },
      paymentStatus: "pending",
      paymentAmount: feeAmount,
      currency: "AED",
      schoolBulkRef: body.schoolBulkRef?.trim() || undefined,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        submittedAt: new Date(),
      },
    });

    await submission.save();

    logger.info(`[national-day] Draft submission saved: ${submission._id} (${regType}) for ${submission.participant.studentFullName}`);

    return res.status(201).json({
      success: true,
      message: "Submission draft saved. Proceed to payment.",
      data: {
        submissionId: submission._id,
        submissionRef: (submission as any).submissionRef,
        amount: feeAmount,
        currency: "AED",
      },
    });
  }
);

// ─── Create Checkout Session ─────────────────────────────────────────────────

export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { submissionId } = req.body;

    if (!submissionId) {
      return next(new AppError("submissionId is required", 400));
    }

    const submission = await NationalDaySubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    if (submission.paymentStatus === "paid") {
      return next(new AppError("This submission has already been paid for", 400));
    }

    const frontendUrl = config.frontendUrl || "http://localhost:5173";
    const amountInFils = (submission.paymentAmount || 35) * 100; // 3500 fils = 35 AED

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aed",
            product_data: {
              name: "Kidrove UAE National Day Art Competition 2026 — Entry Fee",
              description: `Theme: "My UAE, My Pride" · Entry for ${submission.participant.studentFullName} (${submission.participant.category})`,
            },
            unit_amount: amountInFils,
          },
          quantity: 1,
        },
      ],
      customer_email: submission.participant.parentEmail,
      metadata: {
        competitionType: "national-day-2026",
        submissionId: submission._id.toString(),
        studentName: submission.participant.studentFullName,
      },
      success_url: `${frontendUrl}/national-day-art-competition/payment-success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submission._id.toString()}`,
      cancel_url: `${frontendUrl}/national-day-art-competition?payment=cancelled&submission_id=${submission._id.toString()}`,
    });

    submission.checkoutSessionId = session.id;
    await submission.save();

    logger.info(`[national-day] Checkout session created: ${session.id} for submission ${submission._id}`);

    return res.status(200).json({
      success: true,
      data: {
        sessionUrl: session.url,
        sessionId: session.id,
      },
    });
  }
);

// ─── Finalize Submission ─────────────────────────────────────────────────────

export const finalizeSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { submissionId, sessionId } = req.body;

    if (!submissionId || !sessionId) {
      return next(new AppError("submissionId and sessionId are required", 400));
    }

    const submission = await NationalDaySubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    const subRef = (submission as any).submissionRef || `UAE2026-${submission._id.toString().slice(-8).toUpperCase()}`;

    // Already finalized — idempotent response
    if (submission.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Submission already confirmed",
        data: {
          submissionId: submission._id,
          submissionRef: subRef,
          studentName: submission.participant.studentFullName,
          artworkTitle: submission.artwork.title,
        },
      });
    }

    // Verify session
    if (sessionId === "TEST_PAYMENT_SKIP" && process.env.NODE_ENV !== "production") {
      logger.info(`[national-day] Test payment bypass used for submission ${submissionId}`);
    } else {
      let session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (err) {
        logger.error(`[national-day] Failed to retrieve checkout session ${sessionId}`, err);
        return next(new AppError("Could not verify payment. Please contact support.", 502));
      }

      if (session.payment_status !== "paid") {
        return next(new AppError("Payment has not been completed. Please complete payment before submitting.", 402));
      }
    }

    // Activate submission
    submission.paymentStatus = "paid";
    submission.checkoutSessionId = sessionId;
    await submission.save();

    logger.info(`[national-day] Submission finalized: ${submission._id} — ${submission.participant.studentFullName}`);

    // Create / link Parent & Student record
    try {
      const parentEmail = submission.participant.parentEmail;
      const parentName = submission.participant.parentName;
      let parentUser = await User.findOne({ email: parentEmail });

      if (!parentUser) {
        const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
        parentUser = new User({
          firstName: parentName.split(" ")[0] || parentName,
          lastName: parentName.split(" ").slice(1).join(" ") || "Parent",
          email: parentEmail,
          phone: submission.participant.parentPhone,
          role: UserRole.PARENT,
          password: tempPassword,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        });
        await parentUser.save();
      }

      const existingStudent = await Student.findOne({
        parentId: parentUser._id,
        name: new RegExp(`^${submission.participant.studentFullName.trim()}$`, "i"),
      });

      if (!existingStudent) {
        const student = new Student({
          parentId: parentUser._id,
          name: submission.participant.studentFullName.trim(),
          age: submission.participant.studentAge,
          school: submission.participant.schoolName,
          emirate: submission.participant.schoolEmirate,
        });
        await student.save();
      }

      // Send confirmation email
      try {
        await emailService.sendCompetitionSubmissionEmail({
          to: parentEmail,
          parentName: submission.participant.parentName,
          studentName: submission.participant.studentFullName,
          refNo: subRef,
          artworkTitle: submission.artwork.title,
          competitionName: "UAE National Day Art Competition 2026",
          competitionBadge: "🇦🇪 UAE National Day Art 2026",
        });
      } catch (emailErr) {
        logger.warn(`[national-day] Confirmation email failed for ${parentEmail}`, emailErr);
      }
    } catch (err) {
      logger.error("[national-day] Post-finalization user creation error:", err);
    }

    return res.status(200).json({
      success: true,
      message: "Submission received and confirmed!",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        studentName: submission.participant.studentFullName,
        artworkTitle: submission.artwork.title,
      },
    });
  }
);

// ─── School Bulk Inquiry ─────────────────────────────────────────────────────

export const handleSchoolBulkInquiry = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { schoolName, contactPerson, email, phone, emirate, estimatedStudents, notes } = req.body;

    if (!schoolName || !contactPerson || !email || !phone) {
      return next(new AppError("Please provide all required school contact details", 400));
    }

    logger.info(`[national-day] School bulk inquiry received from ${schoolName} (${contactPerson})`);

    return res.status(200).json({
      success: true,
      message: "Thank you for reaching out! Our school coordinator will contact you within 24 hours with the bulk registration pack and discounted invoice details.",
    });
  }
);

// ─── Admin: List Submissions ─────────────────────────────────────────────────

export const getSubmissions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter["participant.category"] = req.query.category;
    }
    if (req.query.emirate) {
      filter["participant.schoolEmirate"] = req.query.emirate;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.medal) {
      filter.medal = req.query.medal;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      filter.$or = [
        { "participant.studentFullName": searchRegex },
        { "participant.parentEmail": searchRegex },
        { "participant.schoolName": searchRegex },
        { "artwork.title": searchRegex },
      ];
    }

    const [submissions, total] = await Promise.all([
      NationalDaySubmission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NationalDaySubmission.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        submissions,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// ─── Admin: Update Status ────────────────────────────────────────────────────

export const updateSubmissionStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, adminNotes, medal, certificateTemplateId } = req.body;

    const submission = await NationalDaySubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    if (status) submission.status = status;
    if (adminNotes !== undefined) submission.adminNotes = adminNotes;
    if (medal !== undefined) submission.medal = medal;
    if (certificateTemplateId !== undefined) (submission as any).certificateTemplateId = certificateTemplateId;

    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Submission updated successfully",
      data: submission,
    });
  }
);

// ─── Admin: Delete Submission ────────────────────────────────────────────────

export const deleteSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const submission = await NationalDaySubmission.findById(req.params.id);

    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    if (submission.artworkUpload?.artworkPublicId) {
      try {
        await uploadService.deleteFromCloudinary(submission.artworkUpload.artworkPublicId);
      } catch (err) {
        logger.warn(`[national-day] Failed to delete artwork from Cloudinary for ${submission._id}`, err);
      }
    }

    await submission.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
      data: {},
    });
  }
);

// ─── Admin: Generate Certificate ─────────────────────────────────────────────

export const generateSubmissionCertificate = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { templateId, medal } = req.body;

    if (!templateId) {
      return next(new AppError("Template ID is required", 400));
    }

    const submission = await NationalDaySubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    const certificate = await certificateService.createCertificate({
      templateId,
      eventId: submission._id.toString(),
      userId: req.user?._id?.toString() || req.user?.id || submission._id.toString(),
      recipient: {
        name: submission.participant.studentFullName,
        email: submission.participant.parentEmail,
      },
      data: {
        studentName: submission.participant.studentFullName,
        parentName: submission.participant.parentName,
        schoolName: submission.participant.schoolName,
        artworkTitle: submission.artwork.title,
        grade: submission.participant.grade,
        category: submission.participant.category,
        competitionName: "UAE National Day Art Competition 2026",
        ...(medal ? { medal } : {}),
      },
      issuedBy: req.user?._id?.toString() || req.user?.id,
    });

    await certificateService.generateCertificateSynchronously(certificate._id.toString(), {
      templateId,
      recipient: {
        name: submission.participant.studentFullName,
        email: submission.participant.parentEmail,
      },
      data: {
        studentName: submission.participant.studentFullName,
        parentName: submission.participant.parentName,
        schoolName: submission.participant.schoolName,
        artworkTitle: submission.artwork.title,
        grade: submission.participant.grade,
        category: submission.participant.category,
        competitionName: "UAE National Day Art Competition 2026",
        ...(medal ? { medal } : {}),
      },
      sendEmail: true,
    });

    return res.status(200).json({
      success: true,
      message: "Certificate generated successfully",
      data: { certificate },
    });
  }
);
