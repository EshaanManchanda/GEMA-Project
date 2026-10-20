import { Request, Response, NextFunction } from "express";
import { catchAsync, AppError } from "../middleware/index";
import NationalDaySubmission, {
  INationalDaySubmission,
  RegistrationType,
  SubmissionStatus,
} from "../models/NationalDaySubmission";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import Contact from "../models/Contact";
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

// ─── Save Phase 1 Registration (No Artwork Required) ───────────────────────────

export const registerParticipant = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;

    if (!body.studentFullName || !body.studentAge || !body.grade || !body.schoolName || !body.schoolEmirate) {
      return next(new AppError("Student details (name, age, grade, school, emirate) are required", 400));
    }
    if (!body.parentName || !body.parentEmail || !body.parentPhone) {
      return next(new AppError("Parent/Guardian details (name, email, phone) are required", 400));
    }

    const regType = body.registrationType === "school_bulk" 
      ? RegistrationType.SCHOOL_BULK 
      : RegistrationType.INDIVIDUAL;
      
    const feeAmount = regType === RegistrationType.SCHOOL_BULK ? 40 : 50;
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

    logger.info(`[national-day] Phase 1 registration saved: ${submission._id} (${regType}) for ${submission.participant.studentFullName}`);

    return res.status(201).json({
      success: true,
      message: "Registration saved. Proceed to payment.",
      data: {
        submissionId: submission._id,
        submissionRef: (submission as any).submissionRef,
        amount: feeAmount,
        currency: "AED",
      },
    });
  }
);

// Backward-compatible alias for existing draft calls if any
export const saveDraftSubmission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    return registerParticipant(req, res, next);
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
    const amountInFils = (submission.paymentAmount || 50) * 100; // 5000 fils = 50 AED

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aed",
            product_data: {
              name: "Kidrove Eid Al Etihad Children's Art Competition 2026 — Entry Fee",
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
    const studentGrade = submission.participant?.grade || "";
    const isLittleArtist =
      submission.participant?.category === "Little Artists" ||
      ["Kindergarten", "Grade 1", "Grade 2"].includes(studentGrade) ||
      /kindergarten|^kg$|grade\s*[12]\b/i.test(studentGrade);

    // Already finalized — idempotent response
    if (submission.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Submission already confirmed",
        data: {
          submissionId: submission._id,
          submissionRef: subRef,
          studentName: submission.participant.studentFullName,
          grade: submission.participant.grade,
          category: submission.participant.category,
          isLittleArtist,
          artworkTitle: submission.artwork?.title || "",
          hasArtwork: Boolean(submission.artworkUpload?.artworkUrl),
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

    logger.info(`[national-day] Registration finalized & paid: ${submission._id} — ${submission.participant.studentFullName}`);

    // Create / link Parent & Student record (matches competition.controller.ts)
    const parentEmail = submission.participant.parentEmail;
    const parentName = submission.participant.parentName;
    const studentFullName = submission.participant.studentFullName;

    if (parentEmail && studentFullName) {
      try {
        let parentUser = await User.findOne({ email: parentEmail });
        let isNewUser = false;
        let tempPassword = "";

        if (!parentUser) {
          isNewUser = true;
          tempPassword = Math.random().toString(36).slice(-8) + "!1A";

          const nameParts = parentName ? parentName.trim().split(/\s+/) : ["Parent"];
          const parentFirstName = nameParts[0] || "Parent";
          const parentLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

          parentUser = await User.create({
            firstName: parentFirstName,
            lastName: parentLastName,
            email: parentEmail,
            phone: submission.participant.parentPhone,
            passwordHash: tempPassword,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          });
          logger.info(`[national-day] Created new parent account for ${parentEmail}`);
        }

        const studentParts = studentFullName.trim().split(/\s+/);
        const firstName = studentParts[0] || "Student";
        const lastName = studentParts.length > 1 ? studentParts.slice(1).join(" ") : "Student";

        const existingStudent = await Student.findOne({
          parentUserId: parentUser._id,
          firstName,
          lastName,
        });

        if (!existingStudent) {
          await Student.create({
            parentUserId: parentUser._id,
            email: parentEmail,
            firstName,
            lastName,
            grade: submission.participant.grade,
            phone: submission.participant.parentPhone,
            schoolId: submission.participant.schoolName,
          });
          logger.info(`[national-day] Created student record for ${studentFullName}`);
        }

        if (isNewUser) {
          try {
            const welcomeHtml = `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to KidRove</title></head>
              <body style="font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px;background:#f8fafc;">
                <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                  <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:40px 30px;text-align:center;">
                    <div style="font-size:42px;margin-bottom:12px;">🇦🇪</div>
                    <h1 style="margin:0;color:white;font-size:26px;font-weight:800;">Welcome to KidRove!</h1>
                    <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your parent account has been created</p>
                  </div>
                  <div style="padding:35px 30px;">
                    <p style="font-size:16px;color:#374151;line-height:1.7;margin-top:0;">Hi <strong>${parentUser.firstName}</strong>,</p>
                    <p style="font-size:15px;color:#4b5563;line-height:1.7;">
                      Thank you for registering for the <strong style="color:#059669;">Eid Al Etihad Children's Art Competition 2026</strong>. We've created a parent account for you so you can track your child's entry and submit their artwork.
                    </p>
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #059669;border-radius:12px;padding:20px;margin:24px 0;">
                      <p style="margin:0 0 5px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#166534;">Your Login Credentials</p>
                      <table style="width:100%;border-collapse:collapse;margin-top:10px;">
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px dashed #bbf7d0;color:#6b7280;font-size:13px;width:40%;">Login Email</td>
                          <td style="padding:8px 0;border-bottom:1px dashed #bbf7d0;color:#1f2937;font-size:13px;font-weight:700;">${parentEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;color:#6b7280;font-size:13px;">Temporary Password</td>
                          <td style="padding:8px 0;"><code style="background:#1f2937;color:#34d399;padding:4px 10px;border-radius:6px;font-size:13px;letter-spacing:1px;">${tempPassword}</code></td>
                        </tr>
                      </table>
                    </div>
                    <div style="text-align:center;margin:28px 0;">
                      <a href="${config.frontendUrl}/login" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:700;font-size:14px;">Login to Your Account →</a>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `;
            await emailService.sendEmail({
              to: parentEmail,
              subject: "Welcome to KidRove — Your Account Details",
              html: welcomeHtml,
              text: `Welcome to KidRove, ${parentUser.firstName}! Your account has been created. Login at ${config.frontendUrl}/login with email: ${parentEmail} and password: ${tempPassword}`,
              notificationType: "essential",
            });
            logger.info(`[national-day] Sent welcome email with credentials to ${parentEmail}`);
          } catch (welcomeErr) {
            logger.error(`[national-day] Failed to send welcome email to ${parentEmail}`, welcomeErr);
          }
        }
      } catch (err) {
        logger.error("[national-day] Post-finalization parent/student user creation error:", err);
      }
    }

    // Send automated Phase 1 Registration email with template / submit instructions
    try {
      logger.info(`[national-day] Dispatching Phase 1 registration confirmation email to: ${parentEmail}`);
      await emailService.sendNationalDayRegistrationEmail({
        to: parentEmail,
        parentName: submission.participant.parentName,
        studentName: submission.participant.studentFullName,
        refNo: subRef,
        grade: submission.participant.grade,
        category: submission.participant.category,
        isLittleArtist,
      });
      logger.info(`[national-day] Phase 1 confirmation email successfully sent to ${parentEmail}`);
    } catch (emailErr) {
      logger.error(`[national-day] Confirmation email delivery failed for ${parentEmail}:`, emailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Registration received and confirmed!",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        studentName: submission.participant.studentFullName,
        grade: submission.participant.grade,
        category: submission.participant.category,
        isLittleArtist,
        artworkTitle: submission.artwork?.title || "",
        hasArtwork: Boolean(submission.artworkUpload?.artworkUrl),
      },
    });
  }
);

// ─── Phase 2: Lookup Submission by Reference No & Email ─────────────────────

export const lookupSubmissionByRef = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const rawRef = (req.params.refNo || req.query.refNo as string || "").trim();
    const email = (req.query.email as string || "").trim().toLowerCase();

    if (!rawRef) {
      return next(new AppError("Reference number is required", 400));
    }

    // Reference format: UAE2026-XXXXXXXX or 24-char ObjectId
    let submission: INationalDaySubmission | null = null;

    if (rawRef.length === 24 && /^[0-9a-fA-F]{24}$/.test(rawRef)) {
      submission = await NationalDaySubmission.findById(rawRef);
    } else {
      // Extract last 8 hex chars if format is UAE2026-XXXXXXXX
      const suffix = rawRef.toUpperCase().replace(/^UAE2026-/, "").trim();
      if (suffix.length === 8) {
        // Query matching regex on stringified ObjectId ending
        const candidates = await NationalDaySubmission.find({}).sort({ createdAt: -1 }).limit(100);
        submission = candidates.find(c => c._id.toString().slice(-8).toUpperCase() === suffix) || null;
      }
    }

    if (!submission) {
      return next(new AppError("No registration found with this Reference Number. Please check and try again.", 404));
    }

    // If email provided, verify it matches
    if (email && submission.participant.parentEmail.toLowerCase() !== email) {
      return next(new AppError("Email does not match the registered parent email for this Reference Number", 403));
    }

    // Verify payment completed
    if (submission.paymentStatus !== "paid") {
      return next(new AppError("The registration fee for this entry has not been paid yet. Please complete payment first.", 402));
    }

    const subRef = (submission as any).submissionRef || `UAE2026-${submission._id.toString().slice(-8).toUpperCase()}`;

    return res.status(200).json({
      success: true,
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        participant: {
          studentFullName: submission.participant.studentFullName,
          studentAge: submission.participant.studentAge,
          grade: submission.participant.grade,
          category: submission.participant.category,
          schoolName: submission.participant.schoolName,
          schoolEmirate: submission.participant.schoolEmirate,
          parentName: submission.participant.parentName,
          parentEmail: submission.participant.parentEmail,
        },
        hasArtwork: Boolean(submission.artworkUpload?.artworkUrl),
        artwork: submission.artwork || null,
        artworkUpload: submission.artworkUpload ? {
          artworkUrl: submission.artworkUpload.artworkUrl,
          artworkOriginalName: submission.artworkUpload.artworkOriginalName,
          artworkMimetype: submission.artworkUpload.artworkMimetype,
        } : null,
        status: submission.status,
      },
    });
  }
);

// ─── Phase 2: Submit Artwork ────────────────────────────────────────────────

export const submitArtwork = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const artworkFile = files?.["artwork"]?.[0];

    if (!artworkFile) {
      return next(new AppError("Artwork file is required", 400));
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!allowedMimes.includes(artworkFile.mimetype)) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Only JPG, PNG, WEBP and PDF files are accepted for artwork", 400));
    }

    const MAX_ARTWORK_SIZE = 1 * 1024 * 1024; // 1 MB
    if (artworkFile.size > MAX_ARTWORK_SIZE) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) {
        fs.unlinkSync(artworkFile.path);
      }
      return next(new AppError("Artwork file must be 1 MB or less", 400));
    }

    const { submissionId, refNo, artworkTitle, artworkDescription, medium, themePillar } = req.body;

    if (!submissionId && !refNo) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) fs.unlinkSync(artworkFile.path);
      return next(new AppError("submissionId or refNo is required", 400));
    }

    let submission: INationalDaySubmission | null = null;
    if (submissionId) {
      submission = await NationalDaySubmission.findById(submissionId);
    } else if (refNo) {
      const suffix = refNo.toUpperCase().replace(/^UAE2026-/, "").trim();
      const candidates = await NationalDaySubmission.find({}).sort({ createdAt: -1 }).limit(100);
      submission = candidates.find(c => c._id.toString().slice(-8).toUpperCase() === suffix) || null;
    }

    if (!submission) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) fs.unlinkSync(artworkFile.path);
      return next(new AppError("Registration record not found", 404));
    }

    if (submission.paymentStatus !== "paid") {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) fs.unlinkSync(artworkFile.path);
      return next(new AppError("Registration fee must be paid before submitting artwork", 402));
    }

    // Check if artwork is already submitted or under review
    const alreadySubmittedStatuses: string[] = [
      SubmissionStatus.UNDER_REVIEW,
      SubmissionStatus.APPROVED,
      SubmissionStatus.WINNER,
    ];
    if (submission.artworkUpload?.artworkUrl || alreadySubmittedStatuses.includes(submission.status)) {
      if (artworkFile.path && fs.existsSync(artworkFile.path)) fs.unlinkSync(artworkFile.path);
      return next(
        new AppError(
          "Artwork has already been submitted for this registration and is currently under review. Further submissions are not permitted.",
          409
        )
      );
    }

    // Upload artwork to Cloudinary
    let artworkUrl = "";
    let artworkPublicId = "";

    try {
      if ((artworkFile as any).path?.startsWith("http") || (artworkFile as any).secure_url) {
        artworkUrl = (artworkFile as any).secure_url || (artworkFile as any).path;
        artworkPublicId = (artworkFile as any).public_id || (artworkFile as any).filename || "";
      } else if (artworkFile.path) {
        // Use 'image' resource type even for PDFs so Cloudinary renders & serves them seamlessly without raw-delivery blocks
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

    // Update submission with artwork
    submission.artwork = {
      title: artworkTitle?.trim() || `${submission.participant.studentFullName}'s Eid Al Etihad Artwork`,
      description: artworkDescription?.trim() || "Celebrating UAE National Day / Eid Al Etihad 2026.",
      medium: medium?.trim() || "Pencil / Drawing",
      themePillar: themePillar?.trim() || "Heritage & Traditions",
    };

    submission.artworkUpload = {
      artworkUrl,
      artworkPublicId,
      artworkOriginalName: artworkFile.originalname,
      artworkSize: artworkFile.size,
      artworkMimetype: artworkFile.mimetype,
    };

    submission.status = SubmissionStatus.UNDER_REVIEW;
    await submission.save();

    const subRef = (submission as any).submissionRef || `UAE2026-${submission._id.toString().slice(-8).toUpperCase()}`;

    // Send final artwork submission email
    try {
      await emailService.sendCompetitionSubmissionEmail({
        to: submission.participant.parentEmail,
        parentName: submission.participant.parentName,
        studentName: submission.participant.studentFullName,
        refNo: subRef,
        artworkTitle: submission.artwork.title || "Eid Al Etihad Artwork",
        competitionName: "Eid Al Etihad Children's Art Competition 2026",
        competitionBadge: "🇦🇪 Eid Al Etihad Children's Art Competition 2026",
      });
    } catch (emailErr) {
      logger.warn(`[national-day] Submission receipt email failed for ${submission.participant.parentEmail}`, emailErr);
    }

    logger.info(`[national-day] Artwork submitted for: ${submission._id} (${subRef})`);

    return res.status(200).json({
      success: true,
      message: "Artwork uploaded successfully! Your entry is now under review.",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        studentName: submission.participant.studentFullName,
        artworkTitle: submission.artwork.title,
        artworkUrl: submission.artworkUpload.artworkUrl,
        submittedAt: new Date(),
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

    const messageLines = [
      `[School Bulk Registration Inquiry - Eid Al Etihad 2026]`,
      `School Name: ${schoolName}`,
      `Coordinator: ${contactPerson}`,
      `Phone: ${phone}`,
      `Emirate: ${emirate || "Not specified"}`,
      `Estimated Students: ${estimatedStudents || "25+"}`,
    ];
    if (notes && notes.trim()) {
      messageLines.push(`Notes: ${notes.trim()}`);
    }

    try {
      const contactRecord = new Contact({
        name: `${contactPerson} (${schoolName})`,
        email: email.trim().toLowerCase(),
        subject: "General Inquiry",
        message: messageLines.join("\n"),
        status: "new",
      });
      await contactRecord.save();
      logger.info(`[national-day] Saved school bulk inquiry to Contact collection for ${schoolName}`);
    } catch (dbErr) {
      logger.error(`[national-day] Failed to save school bulk inquiry to Contact collection:`, dbErr);
    }

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
        competitionName: "Eid Al Etihad Children's Art Competition 2026",
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
        competitionName: "Eid Al Etihad Children's Art Competition 2026",
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

// ─── Download / View Artwork File (Direct Proxy Stream) ───────────────────────

export const downloadArtwork = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const submission = await NationalDaySubmission.findById(id);

    if (!submission || !submission.artworkUpload?.artworkUrl) {
      return next(new AppError("Artwork file not found", 404));
    }

    const originalUrl = submission.artworkUpload.artworkUrl;
    const publicId = submission.artworkUpload.artworkPublicId;
    const originalName = submission.artworkUpload.artworkOriginalName || "artwork.pdf";
    const mimetype = submission.artworkUpload.artworkMimetype || "application/pdf";
    const isDownload = req.query.download === "true" || req.query.download === "1";

    const { v2: cloudinary } = await import("cloudinary");
    const axios = (await import("axios")).default;

    // Build signed download candidates to bypass Cloudinary raw/private 401 restrictions
    const urlsToTry: string[] = [];

    if (publicId) {
      // 1. Time-limited private download URL for raw asset
      try {
        const ext = originalName.split(".").pop() || "pdf";
        const privateDownloadUrl = cloudinary.utils.private_download_url(publicId, ext, {
          resource_type: "raw",
          type: "upload",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
        if (privateDownloadUrl) urlsToTry.push(privateDownloadUrl);
      } catch (e) {
        // ignore
      }

      // 2. Standard signed raw URL
      try {
        const signedRawUrl = cloudinary.url(publicId, {
          resource_type: "raw",
          sign_url: true,
          secure: true,
        });
        if (signedRawUrl) urlsToTry.push(signedRawUrl);
      } catch (e) {
        // ignore
      }

      // 3. Signed image URL (in case treated as image)
      try {
        const signedImageUrl = cloudinary.url(publicId, {
          resource_type: "image",
          sign_url: true,
          secure: true,
        });
        if (signedImageUrl) urlsToTry.push(signedImageUrl);
      } catch (e) {
        // ignore
      }
    }

    // 4. Stored original URL as fallback
    urlsToTry.push(originalUrl);

    for (const url of urlsToTry) {
      try {
        const response = await axios.get(url, {
          responseType: "stream",
          timeout: 25000,
        });

        res.setHeader("Content-Type", mimetype);
        res.setHeader(
          "Content-Disposition",
          `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(originalName)}"`
        );

        return response.data.pipe(res);
      } catch (streamErr: any) {
        logger.warn(`[national-day] Attempt with URL failed (${streamErr?.response?.status || streamErr?.message}): ${url.slice(0, 80)}...`);
      }
    }

    // If all stream attempts fail, redirect to the best signed link
    const fallbackRedirect = urlsToTry[0] || originalUrl;
    return res.redirect(fallbackRedirect);
  }
);
