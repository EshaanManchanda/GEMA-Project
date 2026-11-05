import uploadService from "../services/upload.service";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { catchAsync, AppError } from "../middleware/index";
import ReelSubmission, {
  ReelRegistrationType,
  ReelSubmissionStatus,
} from "../models/ReelSubmission";
import Contact from "../models/Contact";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import logger from "../config/logger";
import { config } from "../config";
import { AuthRequest } from "../types";
import { emailService } from "../services/email.service";
import { certificateService } from "../modules/certificates/services/certificate.service";
import { createCompetitionOrder } from "../utils/competitionOrder.utils";
import { stripe } from "../config/stripe";

// Helper: map grade string to Reel category
export const getReelCategoryFromGrade = (grade: string): string => {
  if (!grade) return "Little Reel Creators";
  const normalized = grade.toLowerCase();
  if (
    normalized.includes("kindergarten") ||
    normalized.includes("kg") ||
    normalized.includes("grade 1") ||
    normalized.includes("grade 2")
  ) {
    return "Little Reel Creators";
  }
  if (
    normalized.includes("grade 3") ||
    normalized.includes("grade 4") ||
    normalized.includes("grade 5")
  ) {
    return "Young Reel Makers";
  }
  if (
    normalized.includes("grade 6") ||
    normalized.includes("grade 7") ||
    normalized.includes("grade 8")
  ) {
    return "Creative Storytellers";
  }
  return "Emerging Filmmakers";
};

// ─── Register Participant (Phase 1) ──────────────────────────────────────────

export const registerParticipant = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const body = req.body;

    if (!body.studentFullName || !body.studentAge || !body.grade || !body.schoolName) {
      return next(new AppError("Student details (name, age, grade, school) are required", 400));
    }
    if (!body.parentName || !body.parentEmail || !body.parentPhone) {
      return next(new AppError("Parent/Guardian details (name, email, phone) are required", 400));
    }

    const regType =
      body.registrationType === "school_bulk"
        ? ReelRegistrationType.SCHOOL_BULK
        : ReelRegistrationType.INDIVIDUAL;

    const feeAmount = regType === ReelRegistrationType.SCHOOL_BULK ? 40 : 50;
    const category = body.category || getReelCategoryFromGrade(body.grade);

    const submission = new ReelSubmission({
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
        country: body.country?.trim() || "United Arab Emirates",
        city: body.city?.trim() || undefined,
        schoolName: body.schoolName?.trim(),
      },
      reel: {
        title: body.reelTitle?.trim() || undefined,
        description: body.reelDescription?.trim() || undefined,
        momentTheme: body.momentTheme?.trim() || undefined,
        durationSeconds: body.durationSeconds ? Number(body.durationSeconds) : undefined,
        videoDriveLink: body.videoDriveLink?.trim() || undefined,
        deviceUsed: body.deviceUsed?.trim() || undefined,
      },
      declarations: {
        agreeTerms: body.agreeTerms === "true" || body.agreeTerms === true,
        originalityDeclaration:
          body.originalityDeclaration === "true" || body.originalityDeclaration === true,
        mobileCapturedDeclaration: true,
        musicConsentDeclaration: true,
        privacyPermissionDeclaration: true,
      },
      consent: {
        parentGuardianConsent:
          body.parentGuardianConsent === "true" || body.parentGuardianConsent === true,
        reelDisplayPermission:
          body.reelDisplayPermission === "no" ? "no" : "yes",
        nameDisplayPermission:
          body.nameDisplayPermission === "false" ? false : true,
        competitionUpdatesConsent:
          body.competitionUpdatesConsent === "true" || body.competitionUpdatesConsent === true,
        marketingConsent:
          body.marketingConsent === "true" || body.marketingConsent === true,
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

    const subRef = (submission as any).submissionRef || `REEL2027-${submission._id.toString().slice(-8).toUpperCase()}`;
    logger.info(`[reel-challenge] Phase 1 registration saved: ${submission._id} (${subRef}) for ${submission.participant.studentFullName}`);

    return res.status(201).json({
      success: true,
      message: "Registration saved. Proceed to payment.",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
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

    const submission = await ReelSubmission.findById(submissionId);
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
              name: "Ramadan & Eid Through My Lens — Mobile Reel Competition 2027 — Entry Fee",
              description: `Theme: "The Moments That Make Eid Special" · Entry for ${submission.participant.studentFullName} (${submission.participant.category})`,
            },
            unit_amount: amountInFils,
          },
          quantity: 1,
        },
      ],
      customer_email: submission.participant.parentEmail,
      metadata: {
        competitionType: "gcc-reel-challenge-2027",
        submissionId: submission._id.toString(),
        studentName: submission.participant.studentFullName,
      },
      success_url: `${frontendUrl}/competitions/gcc-reel-challenge/payment-success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submission._id.toString()}`,
      cancel_url: `${frontendUrl}/competitions/gcc-reel-challenge?payment=cancelled&submission_id=${submission._id.toString()}`,
    });

    submission.checkoutSessionId = session.id;
    await submission.save();

    logger.info(`[reel-challenge] Checkout session created: ${session.id} for submission ${submission._id}`);

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

    const submission = await ReelSubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    const subRef = (submission as any).submissionRef || `REEL2027-${submission._id.toString().slice(-8).toUpperCase()}`;

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
          country: submission.participant.country,
          reelTitle: submission.reel?.title || "",
          hasReel: Boolean(submission.reel?.videoUrl || submission.reel?.videoDriveLink),
        },
      });
    }

    // Verify session
    if (sessionId === "TEST_PAYMENT_SKIP" && process.env.NODE_ENV !== "production") {
      logger.info(`[reel-challenge] Test payment bypass used for submission ${submissionId}`);
    } else {
      let session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (err) {
        logger.error(`[reel-challenge] Failed to retrieve checkout session ${sessionId}`, err);
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

    logger.info(`[reel-challenge] Registration finalized & paid: ${submission._id} — ${submission.participant.studentFullName}`);

    // Respond immediately to caller
    res.status(200).json({
      success: true,
      message: "Registration received and confirmed!",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        studentName: submission.participant.studentFullName,
        grade: submission.participant.grade,
        category: submission.participant.category,
        country: submission.participant.country,
        reelTitle: submission.reel?.title || "",
        hasReel: Boolean(submission.reel?.videoUrl || submission.reel?.videoDriveLink),
      },
    });

    // Background Tasks: Accounts, Orders, Emails
    (async () => {
      try {
        const parentEmail = submission.participant.parentEmail;
        const parentName = submission.participant.parentName;
        const studentFullName = submission.participant.studentFullName;

        if (parentEmail && studentFullName) {
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
            logger.info(`[reel-challenge] Created new parent account for ${parentEmail}`);
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
            logger.info(`[reel-challenge] Created student record for ${studentFullName}`);
          }

          if (isNewUser) {
            try {
              const welcomeHtml = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to KidRove</title></head>
                <body style="font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px;background:#0f172a;">
                  <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                    <div style="background:linear-gradient(135deg,#4c1d95 0%,#6d28d9 50%,#7c3aed 100%);padding:40px 30px;text-align:center;border-bottom:3px solid #c084fc;">
                      <div style="font-size:38px;margin-bottom:12px;">🌙</div>
                      <h1 style="margin:0;color:white;font-size:26px;font-weight:800;">Welcome to KidRove!</h1>
                      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your parent account has been created</p>
                    </div>
                    <div style="padding:35px 30px;">
                      <p style="font-size:16px;color:#374151;line-height:1.7;margin-top:0;">Marhaban <strong>${parentUser.firstName}</strong>,</p>
                      <p style="font-size:15px;color:#4b5563;line-height:1.7;">
                        Thank you for registering for <strong style="color:#6d28d9;">KIDROVE GCC Through My Lens - Reel Challenge 2027</strong>. We've set up a parent account for you on Kidrove so you can view your child's entry, check updates, and download participation certificates.
                      </p>
                      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-left:4px solid #7c3aed;border-radius:12px;padding:20px;margin:24px 0;">
                        <p style="margin:0 0 5px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#4338ca;">Your Login Credentials</p>
                        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
                          <tr>
                            <td style="padding:8px 0;border-bottom:1px dashed #e9d5ff;color:#6b7280;font-size:13px;width:40%;">Login Email</td>
                            <td style="padding:8px 0;border-bottom:1px dashed #e9d5ff;color:#1f2937;font-size:13px;font-weight:700;">${parentEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;">Temporary Password</td>
                            <td style="padding:8px 0;"><code style="background:#2e1065;color:#f5f3ff;padding:4px 10px;border-radius:6px;font-size:13px;letter-spacing:1px;">${tempPassword}</code></td>
                          </tr>
                        </table>
                      </div>
                      <div style="text-align:center;margin:28px 0;">
                        <a href="${config.frontendUrl}/login" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:700;font-size:14px;">Login to Your Account →</a>
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
              logger.info(`[reel-challenge] Sent welcome email with credentials to ${parentEmail}`);
            } catch (welcomeErr) {
              logger.error(`[reel-challenge] Failed to send welcome email to ${parentEmail}`, welcomeErr);
            }
          }
        }

        // Create Order record
        await createCompetitionOrder({
          competitionKey: "reel-challenge",
          competitionTitle: "KIDROVE GCC Through My Lens — Reel Challenge 2027 — Entry Fee",
          submissionId: submission._id,
          transactionId: sessionId,
          amountAED: submission.paymentAmount || 50,
          parentEmail: submission.participant.parentEmail,
          parentName: submission.participant.parentName,
          parentPhone: submission.participant.parentPhone,
          studentName: submission.participant.studentFullName,
          ipAddress: submission.metadata?.ipAddress,
        });

        // Phase 1 Registration Confirmation Email
        try {
          logger.info(`[reel-challenge] Dispatching Phase 1 registration confirmation email to: ${parentEmail}`);
          await emailService.sendReelRegistrationEmail({
            to: parentEmail,
            parentName: submission.participant.parentName,
            studentName: submission.participant.studentFullName,
            refNo: subRef,
            grade: submission.participant.grade,
            category: submission.participant.category,
            country: submission.participant.country,
            reelTitle: submission.reel?.title,
          });
          logger.info(`[reel-challenge] Phase 1 confirmation email successfully sent to ${parentEmail}`);
        } catch (emailErr) {
          logger.error(`[reel-challenge] Confirmation email delivery failed for ${parentEmail}:`, emailErr);
        }

        // Video Submission Receipt Email (if video title / link provided at registration)
        if (submission.reel?.title || submission.reel?.videoDriveLink) {
          try {
            await emailService.sendCompetitionSubmissionEmail({
              to: parentEmail,
              parentName: submission.participant.parentName,
              studentName: submission.participant.studentFullName,
              refNo: subRef,
              artworkTitle: submission.reel?.title || "GCC Reel Entry",
              competitionName: "Ramadan & Eid Through My Lens — Mobile Reel Competition 2027",
              competitionBadge: "🌙 GCC Reel Challenge 2027",
            });
            logger.info(`[reel-challenge] Reel submission receipt email sent to ${parentEmail}`);
          } catch (subEmailErr) {
            logger.warn(`[reel-challenge] Reel receipt email warning for ${parentEmail}:`, subEmailErr);
          }
        }
      } catch (bgErr) {
        logger.error("[reel-challenge] Error in background finalization tasks:", bgErr);
      }
    })();
  }
);


// ─── Phase 2: Lookup Reel Submission by Reference No & Email ────────────────

export const lookupSubmissionByRef = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const rawRef = (req.params.refNo || (req.query.refNo as string) || "").trim();
    const email = ((req.query.email as string) || "").trim().toLowerCase();

    if (!rawRef) {
      return next(new AppError("Reference number is required", 400));
    }

    let submission = null;
    if (rawRef.length === 24 && /^[0-9a-fA-F]{24}$/.test(rawRef)) {
      submission = await ReelSubmission.findById(rawRef);
    } else {
      const suffix = rawRef.toUpperCase().replace(/^REEL2027-/, "").trim();
      if (suffix.length === 8) {
        const candidates = await ReelSubmission.find({}).sort({ createdAt: -1 }).limit(100);
        submission = candidates.find((c) => c._id.toString().slice(-8).toUpperCase() === suffix) || null;
      }
    }

    if (!submission) {
      return next(new AppError("No registration found with this Reference Number. Please check and try again.", 404));
    }

    if (email && submission.participant.parentEmail.toLowerCase() !== email) {
      return next(new AppError("Email does not match the registered parent email for this Reference Number", 403));
    }

    if (submission.paymentStatus !== "paid") {
      return next(new AppError("The registration fee for this entry has not been paid yet. Please complete payment first.", 402));
    }

    const subRef = (submission as any).submissionRef || `REEL2027-${submission._id.toString().slice(-8).toUpperCase()}`;

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
          country: submission.participant.country,
          city: submission.participant.city,
          parentName: submission.participant.parentName,
          parentEmail: submission.participant.parentEmail,
        },
        hasReel: Boolean(submission.reel?.videoUrl || submission.reel?.videoDriveLink),
        reel: submission.reel || null,
        status: submission.status,
      },
    });
  }
);

// ─── Phase 2: Submit Video Reel ─────────────────────────────────────────────

export const submitReel = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.["video"]?.[0] || files?.["reel"]?.[0];

    const { submissionId, refNo, reelTitle, reelDescription, momentTheme, durationSeconds, videoDriveLink, deviceUsed } = req.body;

    if (!submissionId && !refNo) {
      if (videoFile?.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      return next(new AppError("submissionId or refNo is required", 400));
    }

    let submission = null;
    if (submissionId) {
      submission = await ReelSubmission.findById(submissionId);
    } else if (refNo) {
      const suffix = refNo.toUpperCase().replace(/^REEL2027-/, "").trim();
      const candidates = await ReelSubmission.find({}).sort({ createdAt: -1 }).limit(100);
      submission = candidates.find((c) => c._id.toString().slice(-8).toUpperCase() === suffix) || null;
    }

    if (!submission) {
      if (videoFile?.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      return next(new AppError("Registration record not found", 404));
    }

    if (submission.paymentStatus !== "paid") {
      if (videoFile?.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      return next(new AppError("Registration fee must be paid before submitting video reel", 402));
    }

    let videoUrl = submission.reel?.videoUrl || "";
    if (videoFile) {
      try {
        const uploadResult = await uploadService.uploadToCloudinary(videoFile.path, {
          folder: "gema/reel-challenge-2027",
          resourceType: "video",
        });

        if (!uploadResult.success || !uploadResult.url) {
          return next(new AppError("Failed to upload video reel. Please try again.", 500));
        }

        videoUrl = uploadResult.url;
        if (fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
      } catch (uploadError) {
        logger.error("[reel-challenge] Cloudinary reel upload failed:", uploadError);
        return next(new AppError("Failed to upload video reel file. Please try again.", 500));
      }
    }

    submission.reel = {
      title: reelTitle?.trim() || submission.reel?.title || `${submission.participant.studentFullName}'s GCC Reel`,
      description: reelDescription?.trim() || submission.reel?.description,
      momentTheme: momentTheme?.trim() || submission.reel?.momentTheme,
      durationSeconds: durationSeconds ? Number(durationSeconds) : submission.reel?.durationSeconds,
      videoUrl: videoUrl || submission.reel?.videoUrl,
      videoDriveLink: videoDriveLink?.trim() || submission.reel?.videoDriveLink,
      deviceUsed: deviceUsed?.trim() || submission.reel?.deviceUsed,
    };

    submission.status = ReelSubmissionStatus.UNDER_REVIEW;
    await submission.save();

    const subRef = (submission as any).submissionRef || `REEL2027-${submission._id.toString().slice(-8).toUpperCase()}`;

    try {
      await emailService.sendCompetitionSubmissionEmail({
        to: submission.participant.parentEmail,
        parentName: submission.participant.parentName,
        studentName: submission.participant.studentFullName,
        refNo: subRef,
        artworkTitle: submission.reel?.title || "GCC Reel Entry",
        competitionName: "Ramadan & Eid Through My Lens — Mobile Reel Competition 2027",
        competitionBadge: "🌙 GCC Reel Challenge 2027",
      });
      logger.info(`[reel-challenge] Reel submission receipt email sent to ${submission.participant.parentEmail}`);
    } catch (subEmailErr) {
      logger.warn(`[reel-challenge] Reel receipt email warning for ${submission.participant.parentEmail}:`, subEmailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Mobile video reel submitted successfully! Your entry is now under review.",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        studentName: submission.participant.studentFullName,
        reelTitle: submission.reel.title,
        videoUrl: submission.reel.videoUrl || submission.reel.videoDriveLink,
        submittedAt: new Date(),
      },
    });
  }
);

// ─── School Bulk Inquiry ──────────────────────────────────────────────────────

export const handleSchoolBulkInquiry = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { schoolName, contactPerson, email, phone, country, estimatedStudents, notes } = req.body;

    if (!schoolName || !contactPerson || !email || !phone) {
      return next(new AppError("Missing required fields for bulk inquiry", 400));
    }

    const messageLines = [
      `[School Bulk Registration Inquiry - GCC Reel Challenge 2027]`,
      `School Name: ${schoolName}`,
      `Coordinator: ${contactPerson}`,
      `Phone: ${phone}`,
      `Country: ${country || "GCC"}`,
      `Estimated Students: ${estimatedStudents || "30+"}`,
    ];
    if (notes && notes.trim()) {
      messageLines.push(`Notes: ${notes.trim()}`);
    }

    try {
      const contact = new Contact({
        name: `${contactPerson} (${schoolName})`,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        subject: `GCC Reel Challenge 2027: Bulk Registration Inquiry — ${schoolName} (${country || "GCC"})`,
        message: messageLines.join("\n"),
        status: "pending",
        metadata: {
          type: "reel_challenge_bulk",
          schoolName,
          country,
          estimatedStudents: Number(estimatedStudents) || 30,
        },
      });
      await contact.save();
      logger.info(`[reel-challenge] Saved school bulk inquiry for ${schoolName}`);
    } catch (dbErr) {
      logger.error(`[reel-challenge] Failed to save school bulk inquiry to Contact collection:`, dbErr);
    }

    return res.status(200).json({
      success: true,
      message: "Thank you! Our GCC Reel Challenge coordinator will contact you within 24 hours with the institutional pack and bulk entry details.",
    });
  }
);

// ─── Admin: List Submissions ──────────────────────────────────────────────────

export const getSubmissions = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
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
    if (req.query.country) {
      filter["participant.country"] = req.query.country;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.medal) {
      filter.medal = req.query.medal;
    }
    if (req.query.search) {
      const q = (req.query.search as string).trim();
      const regex = new RegExp(q, "i");
      filter.$or = [
        { "participant.studentFullName": regex },
        { "participant.parentEmail": regex },
        { "participant.parentPhone": regex },
        { "participant.schoolName": regex },
        { "participant.city": regex },
        { "reel.title": regex },
      ];
    }

    const [submissions, total] = await Promise.all([
      ReelSubmission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      ReelSubmission.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        submissions,
        total,
        page,
        pages,
        limit,
      },
    });
  }
);

// ─── Admin: Update Status ─────────────────────────────────────────────────────

export const updateSubmissionStatus = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, notes, medal, certificateTemplateId } = req.body;

    const submission = await ReelSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    if (status && Object.values(ReelSubmissionStatus).includes(status)) {
      submission.status = status;
    }
    if (notes !== undefined) {
      submission.adminNotes = notes;
    }
    if (medal !== undefined) {
      submission.medal = medal || undefined;
    }
    if (certificateTemplateId !== undefined) {
      submission.certificateTemplateId = certificateTemplateId || undefined;
    }

    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Submission updated successfully",
      data: { submission },
    });
  }
);

// ─── Admin: Delete Submission ─────────────────────────────────────────────────

export const deleteSubmission = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const submission = await ReelSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    await ReelSubmission.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
    });
  }
);

// ─── Admin: Certificate Generation ───────────────────────────────────────────

export const generateSubmissionCertificate = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { templateId, medal } = req.body;

    if (!templateId) {
      return next(new AppError("Template ID is required", 400));
    }

    const submission = await ReelSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    const subRef = (submission as any).submissionRef || `REEL2027-${submission._id.toString().slice(-8).toUpperCase()}`;

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
        artworkTitle: submission.reel?.title || "GCC Reel Challenge Entry",
        grade: submission.participant.grade,
        category: submission.participant.category,
        competitionName: "Ramadan & Eid Through My Lens — Reel Challenge 2027",
        competitionTitle: "Ramadan & Eid Through My Lens — Reel Challenge 2027",
        country: submission.participant.country,
        city: submission.participant.city,
        medal: medal || submission.medal || undefined,
        referenceNo: subRef,
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
        artworkTitle: submission.reel?.title || "GCC Reel Challenge Entry",
        grade: submission.participant.grade,
        category: submission.participant.category,
        competitionName: "Ramadan & Eid Through My Lens — Reel Challenge 2027",
        competitionTitle: "Ramadan & Eid Through My Lens — Reel Challenge 2027",
        country: submission.participant.country,
        city: submission.participant.city,
        medal: medal || submission.medal || undefined,
        referenceNo: subRef,
        ...(medal ? { medal } : {}),
      },
      sendEmail: true,
    });

    submission.certificateTemplateId = templateId;
    if (medal) submission.medal = medal;
    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Certificate generated and emailed successfully",
      data: { certificate },
    });
  }
);

