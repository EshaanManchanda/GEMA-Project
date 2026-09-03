import { Request, Response, NextFunction } from "express";
import { catchAsync, AppError } from "../middleware/index";
import CompetitionSubmission, {
  ArtworkPermission,
  ChangesAfterGeneration,
  CreationType,
  Grade,
  Gender,
  SchoolEmirate,
  SubmissionStatus,
} from "../models/CompetitionSubmission";
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

// ─── Create Payment Intent ──────────────────────────────────────────────────

// @desc    Create a payment intent for AI Art Competition
// @route   POST /api/competition/create-payment-intent
// @access  Public
export const createPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 50 AED in fils
    const amount = 5000;
    const currency = "aed";

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        type: "competition_submission",
      },
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }
    });
  }
);

// ─── Save Draft Submission ───────────────────────────────────────────────────

// @desc    Save competition form data + upload artwork, return submissionId.
//          paymentStatus stays "pending". No email sent yet.
// @route   POST /api/competition/save-draft
// @access  Public
export const saveDraftSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const artworkFile = files?.artwork?.[0];

    if (!artworkFile) {
      return next(new AppError("Artwork file is required", 400));
    }

    const allowedMimes = ["image/jpeg", "image/png"];
    if (!allowedMimes.includes(artworkFile.mimetype)) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Only JPG/JPEG and PNG files are accepted for artwork", 400));
    }

    const MAX_ARTWORK_SIZE = 10 * 1024 * 1024;
    if (artworkFile.size > MAX_ARTWORK_SIZE) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Artwork file must be 10 MB or less", 400));
    }

    // ── Upload artwork to Cloudinary ──────────────────────────────────────────
    let artworkUrl = "";
    let artworkPublicId = "";

    if ((artworkFile as any).path?.startsWith("http") || (artworkFile as any).secure_url) {
      artworkUrl = (artworkFile as any).secure_url || (artworkFile as any).path;
      artworkPublicId = (artworkFile as any).public_id || (artworkFile as any).filename || "";
    } else if (artworkFile.path) {
      const uploadResult = await uploadService.uploadToCloudinary(artworkFile.path, {
        folder: "gema/competition",
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

    // ── Parse arrays ──────────────────────────────────────────────────────────
    let additionalPrompts: string[] = [];
    if (body.additionalPrompts) {
      if (Array.isArray(body.additionalPrompts)) {
        additionalPrompts = body.additionalPrompts.filter(Boolean).slice(0, 3);
      } else if (typeof body.additionalPrompts === "string") {
        try {
          additionalPrompts = JSON.parse(body.additionalPrompts).filter(Boolean).slice(0, 3);
        } catch {
          additionalPrompts = [body.additionalPrompts].filter(Boolean);
        }
      }
    }

    let aiTools: string[] = [];
    if (body.aiTools) {
      if (Array.isArray(body.aiTools)) {
        aiTools = body.aiTools;
      } else if (typeof body.aiTools === "string") {
        try {
          aiTools = JSON.parse(body.aiTools);
        } catch {
          aiTools = [body.aiTools];
        }
      }
    }

    // ── Build & save draft ────────────────────────────────────────────────────
    const submission = new CompetitionSubmission({
      participant: {
        parentName: body.parentName?.trim(),
        parentEmail: body.parentEmail?.trim()?.toLowerCase(),
        parentPhone: body.parentPhone?.trim(),
        studentFullName: body.studentFullName?.trim(),
        studentAge: Number(body.studentAge),
        grade: body.grade,
        cohort: body.cohort || undefined,
        gender: body.gender || undefined,
        schoolName: body.schoolName?.trim(),
        schoolEmirate: body.schoolEmirate,
      },
      artwork: {
        title: body.artworkTitle?.trim(),
        description: body.artworkDescription?.trim(),
      },
      aiCreation: {
        tools: aiTools,
        otherToolName: body.otherToolName?.trim() || undefined,
        creationType: body.creationType,
        mainPrompt: body.mainPrompt?.trim(),
        additionalPrompts,
        changesAfterGeneration: body.changesAfterGeneration,
        changesDescription: body.changesDescription?.trim() || undefined,
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
        responsibleAiDeclaration: body.responsibleAiDeclaration === "true" || body.responsibleAiDeclaration === true,
        originalityDeclaration: body.originalityDeclaration === "true" || body.originalityDeclaration === true,
      },
      consent: {
        parentGuardianConsent: body.parentGuardianConsent === "true" || body.parentGuardianConsent === true,
        artworkDisplayPermission: body.artworkDisplayPermission || ArtworkPermission.NO,
        nameDisplayPermission: body.nameDisplayPermission === "true" || body.nameDisplayPermission === true,
        competitionUpdatesConsent: body.competitionUpdatesConsent === "true" || body.competitionUpdatesConsent === true,
        marketingConsent: body.marketingConsent === "true" || body.marketingConsent === true || false,
      },
      status: SubmissionStatus.PENDING,
      paymentStatus: "pending",
      metadata: {
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
        userAgent: req.headers["user-agent"],
        submittedAt: new Date(),
      },
    });

    await submission.save();

    logger.info(`[competition] Draft saved: ${submission._id} — ${submission.participant.studentFullName}`);

    return res.status(201).json({
      success: true,
      data: {
        submissionId: submission._id.toString(),
      },
    });
  }
);

// ─── Create Checkout Session ─────────────────────────────────────────────────

// @desc    Create a Stripe Checkout Session for a draft submission
// @route   POST /api/competition/create-checkout-session
// @access  Public
export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { submissionId } = req.body;

    if (!submissionId) {
      return next(new AppError("submissionId is required", 400));
    }

    const submission = await CompetitionSubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    if (submission.paymentStatus === "paid") {
      return next(new AppError("This submission has already been paid for", 400));
    }

    const frontendUrl = config.frontendUrl || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aed",
            product_data: {
              name: "KidRove AI Art Competition 2026 — Entry Fee",
              description: `Entry for ${submission.participant.studentFullName}`,
            },
            unit_amount: 5000, // 50.00 AED in fils
          },
          quantity: 1,
        },
      ],
      customer_email: submission.participant.parentEmail,
      metadata: {
        submissionId: submission._id.toString(),
        studentName: submission.participant.studentFullName,
      },
      success_url: `${frontendUrl}/ai-art-competition/payment-success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submission._id.toString()}`,
      cancel_url: `${frontendUrl}/ai-art-competition?payment=cancelled&submission_id=${submission._id.toString()}`,
    });

    // Store the session ID on the draft so we can look it up on verify
    submission.checkoutSessionId = session.id;
    await submission.save();

    logger.info(`[competition] Checkout session created: ${session.id} for submission ${submission._id}`);

    return res.status(200).json({
      success: true,
      data: {
        sessionUrl: session.url,
        sessionId: session.id,
      },
    });
  }
);

// ─── Finalize Submission (verify payment) ────────────────────────────────────

// @desc    After Stripe redirects back, verify payment and activate submission.
// @route   POST /api/competition/finalize
// @access  Public
export const finalizeSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { submissionId, sessionId } = req.body;

    if (!submissionId || !sessionId) {
      return next(new AppError("submissionId and sessionId are required", 400));
    }

    const submission = await CompetitionSubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    // Already finalized — idempotent response
    if (submission.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Submission already confirmed",
        data: {
          submissionId: submission._id,
          submissionRef: `KAC2026-${submission._id.toString().slice(-8).toUpperCase()}`,
          studentName: submission.participant.studentFullName,
          artworkTitle: submission.artwork.title,
        },
      });
    }

    // Verify the Checkout Session belongs to this submission
    if (submission.checkoutSessionId && submission.checkoutSessionId !== sessionId) {
      logger.warn(`[competition] Session mismatch: expected ${submission.checkoutSessionId}, got ${sessionId}`);
      return next(new AppError("Payment session mismatch. Please contact support.", 400));
    }

    // Retrieve session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      logger.error(`[competition] Failed to retrieve checkout session ${sessionId}`, err);
      return next(new AppError("Could not verify payment. Please contact support.", 502));
    }

    if (session.payment_status !== "paid") {
      return next(new AppError("Payment has not been completed. Please complete payment before submitting.", 402));
    }

    // Activate submission
    submission.paymentStatus = "paid";
    submission.checkoutSessionId = sessionId;
    await submission.save();

    logger.info(`[competition] Submission finalized: ${submission._id} — ${submission.participant.studentFullName}`);

    // ── Create or Find Parent User and Student ────────────────────────────────
    const parentEmail = submission.participant.parentEmail;
    const parentName = submission.participant.parentName;
    const studentFullName = submission.participant.studentFullName;

    if (parentEmail && studentFullName) {
      try {
        let parent = await User.findOne({ email: parentEmail });
        let isNewUser = false;
        let tempPassword = "";

        if (!parent) {
          isNewUser = true;
          tempPassword = Math.random().toString(36).slice(-8) + "!1A";

          const nameParts = parentName ? parentName.split(/\s+/) : ["Parent"];
          const parentFirstName = nameParts[0] || "Parent";
          const parentLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

          parent = await User.create({
            firstName: parentFirstName,
            lastName: parentLastName,
            email: parentEmail,
            passwordHash: tempPassword,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          });
        }

        const studentParts = studentFullName.split(/\s+/);
        const firstName = studentParts[0];
        const lastName = studentParts.length > 1 ? studentParts.slice(1).join(" ") : "Student";

        let student = await Student.findOne({ parentUserId: parent._id, firstName, lastName });
        if (!student) {
          await Student.create({
            parentUserId: parent._id,
            email: parentEmail,
            firstName,
            lastName,
            grade: submission.participant.grade,
            phone: submission.participant.parentPhone,
            schoolId: submission.participant.schoolName,
          });
        }

        if (isNewUser) {
          const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4f46e5;">Welcome to KidRove, ${parent.firstName}!</h2>
              <p>Thank you for participating in the KidRove AI Art Competition. A parent account has been created for you to track submissions.</p>
              <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
                <p><strong>Login Email:</strong> ${parentEmail}</p>
                <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
                <p>Please log in at <a href="${config.frontendUrl}/login">${config.frontendUrl}/login</a> and change your password.</p>
              </div>
              <p style="color: #666; font-size: 14px;">If you have any questions, feel free to contact us.</p>
            </div>
          `;
          await emailService.sendEmail({
            to: parentEmail,
            subject: "Welcome to KidRove!",
            html: welcomeHtml,
            text: `Welcome to KidRove, ${parent.firstName}! Login at ${config.frontendUrl}/login`,
            notificationType: "essential",
          });
        }
      } catch (err) {
        logger.error("[competition] Error creating parent/student account:", err);
      }
    }

    // ── Send confirmation email ───────────────────────────────────────────────
    try {
      await emailService.sendCompetitionSubmissionEmail({
        to: submission.participant.parentEmail,
        studentName: submission.participant.studentFullName,
        parentName: submission.participant.parentName,
        refNo: `KAC2026-${submission._id.toString().slice(-8).toUpperCase()}`,
        artworkTitle: submission.artwork.title,
      });
    } catch (err) {
      logger.error(`[competition] Failed to send confirmation email to ${submission.participant.parentEmail}`, err);
    }

    return res.status(200).json({
      success: true,
      message: "Your competition entry has been confirmed! Check your email for a confirmation.",
      data: {
        submissionId: submission._id,
        submissionRef: `KAC2026-${submission._id.toString().slice(-8).toUpperCase()}`,
        studentName: submission.participant.studentFullName,
        artworkTitle: submission.artwork.title,
      },
    });
  }
);

// ─── Submit Competition Entry ─────────────────────────────────────────────────

// @desc    Submit a competition entry (public, multipart/form-data)
// @route   POST /api/competition/submit
// @access  Public
export const submitCompetition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const artworkFile = files?.artwork?.[0];

    // ── Validate required artwork file ────────────────────────────────────────
    if (!artworkFile) {
      return next(new AppError("Artwork file is required", 400));
    }

    // ── Validate artwork mime type ────────────────────────────────────────────
    const allowedMimes = ["image/jpeg", "image/png"];
    if (!allowedMimes.includes(artworkFile.mimetype)) {
      // Clean up local file if stored locally
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Only JPG/JPEG and PNG files are accepted for artwork", 400));
    }

    // ── Validate artwork file size (10 MB) ────────────────────────────────────
    const MAX_ARTWORK_SIZE = 10 * 1024 * 1024; // 10 MB
    if (artworkFile.size > MAX_ARTWORK_SIZE) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Artwork file must be 10 MB or less", 400));
    }

    // ── Upload artwork to Cloudinary ──────────────────────────────────────────
    let artworkUrl = "";
    let artworkPublicId = "";

    // If multer-storage-cloudinary was used, the file is already on Cloudinary
    if ((artworkFile as any).path?.startsWith("http") || (artworkFile as any).secure_url) {
      artworkUrl = (artworkFile as any).secure_url || (artworkFile as any).path;
      artworkPublicId = (artworkFile as any).public_id || (artworkFile as any).filename || "";
    } else if (artworkFile.path) {
      // Local file — upload to Cloudinary via upload service
      const uploadResult = await uploadService.uploadToCloudinary(artworkFile.path, {
        folder: "gema/competition",
        resourceType: "image",
      });

      if (!uploadResult.success || !uploadResult.url) {
        return next(new AppError("Failed to upload artwork. Please try again.", 500));
      }

      artworkUrl = uploadResult.url;
      artworkPublicId = uploadResult.publicId || "";

      // Clean up local file
      if (fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
    } else {
      return next(new AppError("Failed to process artwork file", 500));
    }

    // ── Parse additional prompts ──────────────────────────────────────────────
    let additionalPrompts: string[] = [];
    if (body.additionalPrompts) {
      if (Array.isArray(body.additionalPrompts)) {
        additionalPrompts = body.additionalPrompts.filter(Boolean).slice(0, 3);
      } else if (typeof body.additionalPrompts === "string") {
        try {
          additionalPrompts = JSON.parse(body.additionalPrompts)
            .filter(Boolean)
            .slice(0, 3);
        } catch {
          additionalPrompts = [body.additionalPrompts].filter(Boolean);
        }
      }
    }

    // ── Parse AI tools array ──────────────────────────────────────────────────
    let aiTools: string[] = [];
    if (body.aiTools) {
      if (Array.isArray(body.aiTools)) {
        aiTools = body.aiTools;
      } else if (typeof body.aiTools === "string") {
        try {
          aiTools = JSON.parse(body.aiTools);
        } catch {
          aiTools = [body.aiTools];
        }
      }
    }

    // ── Create or Find Parent User and Student ────────────────────────────────
    const parentEmail = body.parentEmail?.trim()?.toLowerCase();
    const parentName = body.parentName?.trim();
    const studentFullName = body.studentFullName?.trim();
    
    if (parentEmail && studentFullName) {
      try {
        let parent = await User.findOne({ email: parentEmail });
        let isNewUser = false;
        let tempPassword = "";

        if (!parent) {
          isNewUser = true;
          tempPassword = Math.random().toString(36).slice(-8) + "!1A";
          
          const nameParts = parentName ? parentName.split(/\s+/) : ["Parent"];
          const parentFirstName = nameParts[0] || "Parent";
          const parentLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

          parent = await User.create({
            firstName: parentFirstName,
            lastName: parentLastName,
            email: parentEmail,
            passwordHash: tempPassword,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          });
        }

        const studentParts = studentFullName.split(/\s+/);
        const firstName = studentParts[0];
        const lastName = studentParts.length > 1 ? studentParts.slice(1).join(" ") : "Student";

        let student = await Student.findOne({ 
          parentUserId: parent._id, 
          firstName,
          lastName
        });

        if (!student) {
          student = await Student.create({
            parentUserId: parent._id,
            email: parentEmail,
            firstName,
            lastName,
            grade: body.grade,
            phone: body.parentPhone?.trim(),
            schoolId: body.schoolName?.trim()
          });
        }

        if (isNewUser) {
          const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4f46e5;">Welcome to KidRove, ${parent.firstName}!</h2>
              <p>Thank you for participating in the KidRove AI Art Competition. A parent account has been created for you to track submissions.</p>
              <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
                <p><strong>Login Email:</strong> ${parentEmail}</p>
                <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
                <p>Please log in at <a href="${config.frontendUrl}/login">${config.frontendUrl}/login</a> and change your password.</p>
              </div>
              <p style="color: #666; font-size: 14px;">If you have any questions, feel free to contact us.</p>
            </div>
          `;
          
          const welcomeText = `
Welcome to KidRove, ${parent.firstName}!

Thank you for participating in the KidRove AI Art Competition. A parent account has been created for you to track submissions.

Login Email: ${parentEmail}
Temporary Password: ${tempPassword}

Please log in at ${config.frontendUrl}/login and change your password.

If you have any questions, feel free to contact us.
          `.trim();

          await emailService.sendEmail({
            to: parentEmail,
            subject: "Welcome to KidRove!",
            html: welcomeHtml,
            text: welcomeText,
            notificationType: "essential"
          });
        }
      } catch (err) {
        logger.error("[competition] Error creating parent/student account:", err);
      }
    }

    // ── Build document ────────────────────────────────────────────────────────
    const submission = new CompetitionSubmission({
      participant: {
        parentName: body.parentName?.trim(),
        parentEmail: body.parentEmail?.trim()?.toLowerCase(),
        parentPhone: body.parentPhone?.trim(),
        studentFullName: body.studentFullName?.trim(),
        studentAge: Number(body.studentAge),
        grade: body.grade,
        gender: body.gender || undefined,
        schoolName: body.schoolName?.trim(),
        schoolEmirate: body.schoolEmirate,
      },
      artwork: {
        title: body.artworkTitle?.trim(),
        description: body.artworkDescription?.trim(),
      },
      aiCreation: {
        tools: aiTools,
        otherToolName: body.otherToolName?.trim() || undefined,
        creationType: body.creationType,
        mainPrompt: body.mainPrompt?.trim(),
        additionalPrompts,
        changesAfterGeneration: body.changesAfterGeneration,
        changesDescription: body.changesDescription?.trim() || undefined,
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
        responsibleAiDeclaration:
          body.responsibleAiDeclaration === "true" || body.responsibleAiDeclaration === true,
        originalityDeclaration:
          body.originalityDeclaration === "true" || body.originalityDeclaration === true,
      },
      consent: {
        parentGuardianConsent:
          body.parentGuardianConsent === "true" || body.parentGuardianConsent === true,
        artworkDisplayPermission: body.artworkDisplayPermission || ArtworkPermission.NO,
        nameDisplayPermission:
          body.nameDisplayPermission === "true" || body.nameDisplayPermission === true,
        competitionUpdatesConsent:
          body.competitionUpdatesConsent === "true" || body.competitionUpdatesConsent === true,
        marketingConsent:
          body.marketingConsent === "true" || body.marketingConsent === true || false,
      },
      status: SubmissionStatus.PENDING,
      paymentStatus: "pending",
      paymentIntentId: body.paymentIntentId,
      metadata: {
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
        userAgent: req.headers["user-agent"],
        submittedAt: new Date(),
      },
    });

    if (body.paymentIntentId) {
      // Only verify with Stripe if it's a real Stripe payment intent
      const isRealStripeIntent = body.paymentIntentId.startsWith('pi_');
      if (isRealStripeIntent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
          if (paymentIntent.status === "succeeded") {
            submission.paymentStatus = "paid";
          } else {
            // In development/test mode, still allow the submission but mark as pending
            const isTestMode = process.env.NODE_ENV !== 'production';
            submission.paymentStatus = isTestMode ? "pending" : "failed";
          }
        } catch (err) {
          logger.error(`[competition] Failed to retrieve payment intent ${body.paymentIntentId}`, err);
          const isTestMode = process.env.NODE_ENV !== 'production';
          submission.paymentStatus = isTestMode ? "pending" : "failed";
        }
      } else {
        // Non-Stripe intent (test payment flow) — mark as test
        submission.paymentStatus = "pending";
      }
    }

    await submission.save();

    logger.info(
      `[competition] New submission saved: ${submission._id} — ${submission.participant.studentFullName}`,
    );

    // ── Send Email Confirmation ────────────────────────────────────────────────
    try {
      await emailService.sendCompetitionSubmissionEmail({
        to: submission.participant.parentEmail,
        studentName: submission.participant.studentFullName,
        parentName: submission.participant.parentName,
        refNo: `KAC2026-${submission._id.toString().slice(-8).toUpperCase()}`,
        artworkTitle: submission.artwork.title,
      });
    } catch (err) {
      logger.error(`[competition] Failed to send submission email to ${submission.participant.parentEmail}`, err);
    }

    return res.status(201).json({
      success: true,
      message:
        "Your competition entry has been submitted successfully! Check your email for a confirmation.",
      data: {
        submissionId: submission._id,
        submissionRef: `KAC2026-${submission._id.toString().slice(-8).toUpperCase()}`,
        studentName: submission.participant.studentFullName,
        artworkTitle: submission.artwork.title,
      },
    });
  },
);

// ─── Get All Submissions (Admin) ──────────────────────────────────────────────

// @desc    Get all competition submissions with pagination (admin only)
// @route   GET /api/competition/submissions
// @access  Private (Admin)
export const getSubmissions = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.emirate) {
      filter["participant.schoolEmirate"] = req.query.emirate;
    }
    if (req.query.grade) {
      filter["participant.grade"] = req.query.grade;
    }
    if (req.query.medal) {
      filter.medal = req.query.medal;
    }
    if (req.query.search) {
      const searchStr = req.query.search as string;
      const searchRegex = new RegExp(searchStr, "i");
      const orConditions: any[] = [
        { "participant.studentFullName": searchRegex },
        { "participant.parentEmail": searchRegex },
        { "participant.parentName": searchRegex },
        { "artwork.title": searchRegex },
      ];

      if (searchStr.toUpperCase().startsWith("KAC2026-")) {
        const suffix = searchStr.substring(8).toLowerCase();
        orConditions.push({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: new RegExp(`${suffix}$`, "i")
            }
          }
        });
      }

      filter.$or = orConditions;
    }

    const [submissions, total] = await Promise.all([
      CompetitionSubmission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      CompetitionSubmission.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  },
);

// ─── Get Single Submission (Admin) ────────────────────────────────────────────

// @desc    Get a single competition submission by ID (admin only)
// @route   GET /api/competition/submissions/:id
// @access  Private (Admin)
export const getSubmissionById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const submission = await CompetitionSubmission.findById(req.params.id);

    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: { submission },
    });
  },
);

// ─── Update Submission Status (Admin) ────────────────────────────────────────

// @desc    Update competition submission status (admin only)
// @route   PATCH /api/competition/submissions/:id/status
// @access  Private (Admin)
export const updateSubmissionStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, adminNotes, medal, certificateTemplateId } = req.body;

    if (!Object.values(SubmissionStatus).includes(status)) {
      return next(new AppError("Invalid status value", 400));
    }

    const submission = await CompetitionSubmission.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(medal !== undefined ? { medal } : {}),
        ...(certificateTemplateId !== undefined ? { certificateTemplateId } : {}),
      },
      { new: true, runValidators: true },
    );

    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    logger.info(
      `[competition] Submission ${submission._id} status updated to: ${status}`,
    );

    return res.status(200).json({
      success: true,
      message: "Submission status updated",
      data: { submission },
    });
  },
);

// ─── Delete Submission (Admin) ──────────────────────────────────────────────

// @desc    Delete a competition submission
// @route   DELETE /api/competition/submissions/:id
// @access  Private (Admin)
export const deleteSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const submission = await CompetitionSubmission.findById(req.params.id);

    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    // Attempt to delete artwork from Cloudinary if public ID exists
    if (submission.artworkUpload?.artworkPublicId) {
      try {
        await uploadService.deleteFromCloudinary(submission.artworkUpload.artworkPublicId);
      } catch (err) {
        logger.warn(`Failed to delete artwork from Cloudinary for submission ${submission._id}`, err);
      }
    }

    await submission.deleteOne();

    res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
      data: {},
    });
  },
);

// ─── Generate Certificate for Submission (Admin) ──────────────────────────────

// @desc    Generate a certificate for a submission
// @route   POST /api/competition/submissions/:id/certificate
// @access  Private (Admin)
export const generateSubmissionCertificate = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { templateId, medal } = req.body;

    if (!templateId) {
      return next(new AppError("Template ID is required", 400));
    }

    const submission = await CompetitionSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    // We decouple from Event ID by passing the competition submission ID as the event ID,
    // which the underlying DB schema accepts because it's just a string/ObjectId,
    // and we directly call createCertificate to bypass the selectTemplate validation.
    const certificate = await certificateService.createCertificate({
      templateId,
      eventId: submission._id.toString(), // Using submission ID as event ID proxy
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
        ...(medal ? { medal } : {}),
      },
      issuedBy: req.user?._id?.toString() || req.user?.id,
    });

    // Generate PDF synchronously instead of queuing to ensure it doesn't get stuck
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
        ...(medal ? { medal } : {}),
      },
      sendEmail: true,
    });

    res.status(200).json({
      success: true,
      message: "Certificate generated successfully",
      data: { certificate },
    });
  }
);
