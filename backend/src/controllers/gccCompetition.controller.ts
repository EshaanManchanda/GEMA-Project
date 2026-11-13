import uploadService from "../services/upload.service";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { catchAsync, AppError } from "../middleware/index";
import GCCSubmission, {
  GCCRegistrationType,
  GCCSubmissionStatus,
} from "../models/GCCSubmission";
import Contact from "../models/Contact";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import logger from "../config/logger";
import { config } from "../config";
import { AuthRequest } from "../types";
import { emailService } from "../services/email.service";
import { certificateService } from "../modules/certificates/services/certificate.service";
import { createCompetitionOrder } from "../utils/competitionOrder.utils";
import { findBySubmissionRef } from "../utils/submissionRef.utils";
import { stripe } from "../config/stripe";
import { generateTempPassword } from "../utils/otp";
import { escapeHtml } from "../utils/htmlHelpers";

// Helper: map grade string to category
export const getGCCCategoryFromGrade = (grade: string): string => {
  if (!grade) return "Young Authors";
  const normalized = grade.toLowerCase();
  if (
    normalized.includes("grade 3") ||
    normalized.includes("grade 4") ||
    normalized.includes("grade 5")
  ) {
    return "Young Authors";
  }
  if (
    normalized.includes("grade 6") ||
    normalized.includes("grade 7") ||
    normalized.includes("grade 8")
  ) {
    return "Creative Voices";
  }
  return "Emerging Writers";
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
        ? GCCRegistrationType.SCHOOL_BULK
        : GCCRegistrationType.INDIVIDUAL;

    const feeAmount = regType === GCCRegistrationType.SCHOOL_BULK ? 40 : 50;
    const category = body.category || getGCCCategoryFromGrade(body.grade);

    const submission = new GCCSubmission({
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
      story: {
        title: body.storyTitle?.trim() || undefined,
        description: body.storyDescription?.trim() || undefined,
        themePillar: body.themePillar?.trim() || undefined,
        wordCount: body.wordCount ? Number(body.wordCount) : undefined,
        storyContent: body.storyContent?.trim() || undefined,
      },
      declarations: {
        agreeTerms: body.agreeTerms === "true" || body.agreeTerms === true,
        originalityDeclaration:
          body.originalityDeclaration === "true" || body.originalityDeclaration === true,
        writtenShortStoryDeclaration: true,
      },
      consent: {
        parentGuardianConsent:
          body.parentGuardianConsent === "true" || body.parentGuardianConsent === true,
        storyDisplayPermission:
          body.storyDisplayPermission === "no" ? "no" : "yes",
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

    const subRef = (submission as any).submissionRef || `GCC2027-${submission._id.toString().slice(-8).toUpperCase()}`;
    logger.info(`[gcc-competition] Phase 1 registration saved: ${submission._id} (${subRef}) for ${submission.participant.studentFullName}`);

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

    const submission = await GCCSubmission.findById(submissionId);
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
              name: "Young Voices of the GCC Short Story Competition 2027 — Entry Fee",
              description: `Theme: "Our Heritage, Our Story" · Entry for ${submission.participant.studentFullName} (${submission.participant.category})`,
            },
            unit_amount: amountInFils,
          },
          quantity: 1,
        },
      ],
      customer_email: submission.participant.parentEmail,
      metadata: {
        competitionType: "gcc-competition-2027",
        submissionId: submission._id.toString(),
        studentName: submission.participant.studentFullName,
      },
      success_url: `${frontendUrl}/competitions/young-voices-of-the-gcc/payment-success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submission._id.toString()}`,
      cancel_url: `${frontendUrl}/competitions/young-voices-of-the-gcc?payment=cancelled&submission_id=${submission._id.toString()}`,
    });

    submission.checkoutSessionId = session.id;
    await submission.save();

    logger.info(`[gcc-competition] Checkout session created: ${session.id} for submission ${submission._id}`);

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

    const submission = await GCCSubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    const subRef = (submission as any).submissionRef || `GCC2027-${submission._id.toString().slice(-8).toUpperCase()}`;

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
          storyTitle: submission.story?.title || "",
          hasStory: Boolean(submission.storyUpload?.storyUrl || submission.story?.storyContent),
        },
      });
    }

    // Verify session
    if (sessionId === "TEST_PAYMENT_SKIP" && process.env.ALLOW_TEST_PAYMENT_SKIP === "true" && process.env.NODE_ENV !== "production") {
      logger.info(`[gcc-competition] Test payment bypass used for submission ${submissionId}`);
    } else {
      let session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (err) {
        logger.error(`[gcc-competition] Failed to retrieve checkout session ${sessionId}`, err);
        return next(new AppError("Could not verify payment. Please contact support.", 502));
      }

      if (session.payment_status !== "paid") {
        return next(new AppError("Payment has not been completed. Please complete payment before submitting.", 402));
      }

      // A paid session only pays for the submission it was created for (metadata is set
      // server-side in createCheckoutSession) and at the price we set; otherwise one paid
      // session ID could finalize any number of other drafts.
      if (session.metadata?.submissionId !== submission._id.toString()) {
        logger.warn(`[gcc-competition] Session ${sessionId} was not created for submission ${submissionId}`);
        return next(new AppError("Payment session mismatch. Please contact support.", 400));
      }
      if (session.amount_total !== (submission.paymentAmount || 50) * 100 || session.currency !== "aed") {
        logger.warn(`[gcc-competition] Session ${sessionId} amount/currency does not match submission ${submissionId}`);
        return next(new AppError("Payment amount mismatch. Please contact support.", 400));
      }
    }

    // Activate submission. Conditional update: concurrent finalize calls (double click,
    // retry) run the account/order/email work exactly once.
    const claimed = await GCCSubmission.findOneAndUpdate(
      { _id: submission._id, paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "paid", checkoutSessionId: sessionId } },
      { new: true },
    );
    if (!claimed) {
      return res.status(200).json({
        success: true,
        message: "Submission already confirmed",
        data: {
          submissionId: submission._id,
          submissionRef: subRef,
          studentName: submission.participant.studentFullName,
        },
      });
    }

    logger.info(`[gcc-competition] Registration finalized & paid: ${submission._id} — ${submission.participant.studentFullName}`);

    // Respond immediately to avoid client timeout
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
        storyTitle: submission.story?.title || "",
        hasStory: Boolean(submission.storyUpload?.storyUrl || submission.story?.storyContent),
      },
    });

    // Background Tasks: Parent/Student account, Order creation, and Emails
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
            tempPassword = generateTempPassword();

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
            logger.info(`[gcc-competition] Created new parent account for ${parentEmail}`);
          }

          const studentParts = studentFullName.trim().split(/\s+/);
          const firstName = studentParts[0] || "Student";
          const lastName = studentParts.length > 1 ? studentParts.slice(1).join(" ") : "Student";

          // Finalize is unauthenticated: never attach a child to an account the caller
          // hasn't shown they own. Existing parents still get the entry by email.
          if (isNewUser) {
            await Student.create({
              parentUserId: parentUser._id,
              email: parentEmail,
              firstName,
              lastName,
              grade: submission.participant.grade,
              phone: submission.participant.parentPhone,
              schoolId: submission.participant.schoolName,
            });
            logger.info(`[gcc-competition] Created student record for ${studentFullName}`);
          }

          if (isNewUser) {
            try {
              const welcomeHtml = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to KidRove</title></head>
                <body style="font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px;background:#f8fafc;">
                  <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                    <div style="background:linear-gradient(135deg,#0f766e 0%,#047857 100%);padding:40px 30px;text-align:center;">
                      <div style="font-size:38px;margin-bottom:12px;">✨</div>
                      <h1 style="margin:0;color:white;font-size:26px;font-weight:800;">Welcome to KidRove!</h1>
                      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your parent account has been created</p>
                    </div>
                    <div style="padding:35px 30px;">
                      <p style="font-size:16px;color:#374151;line-height:1.7;margin-top:0;">Hi <strong>${escapeHtml(parentUser.firstName)}</strong>,</p>
                      <p style="font-size:15px;color:#4b5563;line-height:1.7;">
                        Thank you for registering for <strong style="color:#0f766e;">Young Voices of the GCC 2027</strong>. We've set up a parent account for you on Kidrove so you can view your child's entry, download certificates, and follow competition updates.
                      </p>
                      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-left:4px solid #0f766e;border-radius:12px;padding:20px;margin:24px 0;">
                        <p style="margin:0 0 5px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#0f766e;">Your Login Credentials</p>
                        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
                          <tr>
                            <td style="padding:8px 0;border-bottom:1px dashed #99f6e4;color:#6b7280;font-size:13px;width:40%;">Login Email</td>
                            <td style="padding:8px 0;border-bottom:1px dashed #99f6e4;color:#1f2937;font-size:13px;font-weight:700;">${escapeHtml(parentEmail)}</td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;">Temporary Password</td>
                            <td style="padding:8px 0;"><code style="background:#1f2937;color:#9DF4F3;padding:4px 10px;border-radius:6px;font-size:13px;letter-spacing:1px;">${tempPassword}</code></td>
                          </tr>
                        </table>
                      </div>
                      <div style="text-align:center;margin:28px 0;">
                        <a href="${config.frontendUrl}/login" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:700;font-size:14px;">Login to Your Account →</a>
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
              logger.info(`[gcc-competition] Sent welcome email with credentials to ${parentEmail}`);
            } catch (welcomeErr) {
              logger.error(`[gcc-competition] Failed to send welcome email to ${parentEmail}`, welcomeErr);
            }
          }
        }

        // Create Order record (links payment to admin dashboard & revenue)
        await createCompetitionOrder({
          competitionKey: "gcc-competition",
          competitionTitle: "Young Voices of the GCC 2027 — Entry Fee",
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
          logger.info(`[gcc-competition] Dispatching Phase 1 registration confirmation email to: ${parentEmail}`);
          await emailService.sendGCCRegistrationEmail({
            to: parentEmail,
            parentName: submission.participant.parentName,
            studentName: submission.participant.studentFullName,
            refNo: subRef,
            grade: submission.participant.grade,
            category: submission.participant.category,
            country: submission.participant.country,
            storyTitle: submission.story?.title,
          });
          logger.info(`[gcc-competition] Phase 1 confirmation email successfully sent to ${parentEmail}`);
        } catch (emailErr) {
          logger.error(`[gcc-competition] Confirmation email delivery failed for ${parentEmail}:`, emailErr);
        }

        // Story Submission Receipt Email (if story title/content provided at registration)
        if (submission.story?.title || submission.story?.storyContent) {
          try {
            await emailService.sendCompetitionSubmissionEmail({
              to: parentEmail,
              parentName: submission.participant.parentName,
              studentName: submission.participant.studentFullName,
              refNo: subRef,
              artworkTitle: submission.story?.title || "GCC Short Story Entry",
              competitionName: "Young Voices of the GCC 2027",
              competitionBadge: "✨ Young Voices of the GCC 2027",
            });
            logger.info(`[gcc-competition] Story submission receipt email sent to ${parentEmail}`);
          } catch (subEmailErr) {
            logger.warn(`[gcc-competition] Story receipt email warning for ${parentEmail}:`, subEmailErr);
          }
        }
      } catch (bgErr) {
        logger.error("[gcc-competition] Error in background finalization tasks:", bgErr);
      }
    })();
  }
);


// ─── Phase 2: Lookup Submission by Reference No & Email ─────────────────────

export const lookupSubmissionByRef = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const rawRef = (req.params.refNo || (req.query.refNo as string) || "").trim();
    const email = ((req.query.email as string) || "").trim().toLowerCase();

    // The reference is guessable, so the parent email is what proves the caller owns the entry.
    if (!rawRef || !email) {
      return next(new AppError("Reference number and parent email are required", 400));
    }

    let submission = null;
    if (rawRef.length === 24 && /^[0-9a-fA-F]{24}$/.test(rawRef)) {
      submission = await GCCSubmission.findById(rawRef);
    } else {
      submission = await findBySubmissionRef(GCCSubmission, "GCC2027", rawRef, email);
    }

    // One response for "no such ref" and "wrong email" so refs can't be probed.
    if (!submission || submission.participant.parentEmail.toLowerCase() !== email) {
      return next(new AppError("No registration found for this Reference Number and email. Please check and try again.", 404));
    }

    if (submission.paymentStatus !== "paid") {
      return next(new AppError("The registration fee for this entry has not been paid yet. Please complete payment first.", 402));
    }

    const subRef = (submission as any).submissionRef || `GCC2027-${submission._id.toString().slice(-8).toUpperCase()}`;

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
        hasStory: Boolean(submission.storyUpload?.storyUrl || submission.story?.storyContent),
        story: submission.story || null,
        storyUpload: submission.storyUpload || null,
        status: submission.status,
      },
    });
  }
);

// ─── Phase 2: Submit Short Story Manuscript ─────────────────────────────────

// The submit page promises "PDF/Word"; the global upload filter allows many more types.
const STORY_UPLOAD_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const submitStory = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const storyFile = files?.["storyFile"]?.[0] || files?.["story"]?.[0];

    const { submissionId, refNo, storyTitle, storyDescription, themePillar, wordCount, storyContent } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();

    if ((!submissionId && !refNo) || !email) {
      if (storyFile?.path && fs.existsSync(storyFile.path)) fs.unlinkSync(storyFile.path);
      return next(new AppError("submissionId or refNo, and the parent email, are required", 400));
    }

    if (storyFile && !STORY_UPLOAD_MIMES.has(storyFile.mimetype)) {
      if (storyFile.path && fs.existsSync(storyFile.path)) fs.unlinkSync(storyFile.path);
      return next(new AppError("Only PDF or Word documents are accepted for the story manuscript", 400));
    }

    let submission = null;
    if (submissionId) {
      submission = await GCCSubmission.findById(submissionId);
    } else if (refNo) {
      submission = await findBySubmissionRef(GCCSubmission, "GCC2027", refNo, email);
    }

    // The ref/id alone doesn't prove ownership: the parent email must match too, and
    // "no such record" and "wrong email" answer identically so records can't be probed.
    if (!submission || submission.participant.parentEmail.toLowerCase() !== email) {
      if (storyFile?.path && fs.existsSync(storyFile.path)) fs.unlinkSync(storyFile.path);
      return next(new AppError("Registration record not found", 404));
    }

    if (submission.paymentStatus !== "paid") {
      if (storyFile?.path && fs.existsSync(storyFile.path)) fs.unlinkSync(storyFile.path);
      return next(new AppError("Registration fee must be paid before submitting story manuscript", 402));
    }

    const alreadySubmittedStatuses: string[] = [
      GCCSubmissionStatus.UNDER_REVIEW,
      GCCSubmissionStatus.APPROVED,
      GCCSubmissionStatus.WINNER,
    ];
    if (submission.storyUpload?.storyUrl && alreadySubmittedStatuses.includes(submission.status)) {
      if (storyFile?.path && fs.existsSync(storyFile.path)) fs.unlinkSync(storyFile.path);
      return next(
        new AppError("A story manuscript has already been submitted for this registration and is currently under review.", 409)
      );
    }

    let storyUrl = "";
    if (storyFile) {
      try {
        const uploadResult = await uploadService.uploadToCloudinary(storyFile.path, {
          folder: "gema/gcc-competition-2027",
          resourceType: "auto",
        });

        if (!uploadResult.success || !uploadResult.url) {
          return next(new AppError("Failed to upload story file. Please try again.", 500));
        }

        storyUrl = uploadResult.url;
        if (fs.existsSync(storyFile.path)) {
          fs.unlinkSync(storyFile.path);
        }

        submission.storyUpload = {
          storyUrl,
          storyPublicId: uploadResult.publicId || "",
          storyOriginalName: storyFile.originalname,
          storyMimetype: storyFile.mimetype,
          storySize: storyFile.size,
          uploadedAt: new Date(),
        };
      } catch (uploadError) {
        logger.error("[gcc-competition] Cloudinary story upload failed:", uploadError);
        return next(new AppError("Failed to upload story file. Please try again.", 500));
      }
    }

    submission.story = {
      title: storyTitle?.trim() || submission.story?.title || `${submission.participant.studentFullName}'s GCC Short Story`,
      description: storyDescription?.trim() || submission.story?.description,
      themePillar: themePillar?.trim() || "Our Heritage, Our Story",
      wordCount: wordCount ? Number(wordCount) : submission.story?.wordCount,
      storyContent: storyContent?.trim() || submission.story?.storyContent,
    };

    submission.status = GCCSubmissionStatus.UNDER_REVIEW;
    await submission.save();

    const subRef = (submission as any).submissionRef || `GCC2027-${submission._id.toString().slice(-8).toUpperCase()}`;

    try {
      await emailService.sendCompetitionSubmissionEmail({
        to: submission.participant.parentEmail,
        parentName: submission.participant.parentName,
        studentName: submission.participant.studentFullName,
        refNo: subRef,
        artworkTitle: submission.story?.title || "GCC Short Story Entry",
        competitionName: "Young Voices of the GCC 2027",
        competitionBadge: "✨ Young Voices of the GCC 2027",
      });
      logger.info(`[gcc-competition] Story receipt email dispatched to ${submission.participant.parentEmail}`);
    } catch (emailErr) {
      logger.warn(`[gcc-competition] Story receipt email failed for ${submission.participant.parentEmail}`, emailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Short story submitted successfully! Your entry is now under review.",
      data: {
        submissionId: submission._id,
        submissionRef: subRef,
        studentName: submission.participant.studentFullName,
        storyTitle: submission.story.title,
        storyUrl: submission.storyUpload?.storyUrl,
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
      `[School Bulk Registration Inquiry - Young Voices of the GCC 2027]`,
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
        subject: `GCC Competition 2027: Bulk Registration Inquiry — ${schoolName} (${country || "GCC"})`,
        message: messageLines.join("\n"),
        status: "pending",
        metadata: {
          type: "gcc_competition_bulk",
          schoolName,
          country,
          estimatedStudents: Number(estimatedStudents) || 30,
        },
      });
      await contact.save();
      logger.info(`[gcc-competition] Saved school bulk inquiry for ${schoolName}`);
    } catch (dbErr) {
      logger.error(`[gcc-competition] Failed to save school bulk inquiry to Contact collection:`, dbErr);
    }

    return res.status(200).json({
      success: true,
      message: "Thank you! Our GCC school coordinator will contact you within 24 hours with the institutional pack and bulk entry details.",
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
        { "story.title": regex },
      ];
    }

    const [submissions, total] = await Promise.all([
      GCCSubmission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      GCCSubmission.countDocuments(filter),
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

    const submission = await GCCSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    if (status && Object.values(GCCSubmissionStatus).includes(status)) {
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
    const submission = await GCCSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    await GCCSubmission.deleteOne({ _id: id });

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

    const submission = await GCCSubmission.findById(id);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }

    const subRef = (submission as any).submissionRef || `GCC2027-${submission._id.toString().slice(-8).toUpperCase()}`;

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
        artworkTitle: submission.story?.title || "GCC Short Story Entry",
        grade: submission.participant.grade,
        category: submission.participant.category,
        competitionName: "Young Voices of the GCC 2027",
        competitionTitle: "Young Voices of the GCC 2027",
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
        artworkTitle: submission.story?.title || "GCC Short Story Entry",
        grade: submission.participant.grade,
        category: submission.participant.category,
        competitionName: "Young Voices of the GCC 2027",
        competitionTitle: "Young Voices of the GCC 2027",
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

// ─── Download / View Story File ───────────────────────────────────────────────

// Types a story manuscript may legitimately be (always downloaded, never rendered).
const SAFE_DOWNLOAD_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export const downloadStoryFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const submission = await GCCSubmission.findById(id);

    if (!submission || !submission.storyUpload?.storyUrl) {
      return next(new AppError("Story file not found", 404));
    }

    const originalUrl = submission.storyUpload.storyUrl;
    let publicId = (submission.storyUpload as any).storyPublicId;
    if (!publicId && originalUrl) {
      const match = originalUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      if (match && match[1]) {
        publicId = decodeURIComponent(match[1]);
      }
    }

    const originalName = submission.storyUpload.storyOriginalName || "story-manuscript.pdf";
    // The mimetype was supplied by the uploader. Only a PDF may render inline;
    // everything else is forced to a download and served as an opaque binary so
    // an uploaded HTML/SVG file can never execute in our origin.
    const storedMime = submission.storyUpload.storyMimetype || "application/pdf";
    const isPdf = storedMime === "application/pdf";
    const mimetype = isPdf || SAFE_DOWNLOAD_MIMES.has(storedMime) ? storedMime : "application/octet-stream";
    const isDownload = !isPdf || req.query.download === "true" || req.query.download === "1";
    const safeName = originalName.replace(/[\r\n"\\]/g, "_");

    const { v2: cloudinary } = await import("cloudinary");
    const axios = (await import("axios")).default;

    const urlsToTry: string[] = [];

    if (publicId) {
      try {
        const privateDownloadUrl = cloudinary.utils.private_download_url(publicId, "", {
          resource_type: "raw",
          type: "upload",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
        if (privateDownloadUrl) urlsToTry.push(privateDownloadUrl);
      } catch (e) {
        // ignore
      }

      try {
        const ext = originalName.split(".").pop() || "pdf";
        const privateDownloadUrlWithExt = cloudinary.utils.private_download_url(publicId.replace(/\.[^/.]+$/, ""), ext, {
          resource_type: "raw",
          type: "upload",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
        if (privateDownloadUrlWithExt) urlsToTry.push(privateDownloadUrlWithExt);
      } catch (e) {
        // ignore
      }
    }

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
          `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(safeName)}"`
        );
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");

        return response.data.pipe(res);
      } catch (streamErr: any) {
        logger.warn(`[gcc-competition] Stream URL failed (${streamErr?.response?.status || streamErr?.message}): ${url.slice(0, 80)}...`);
      }
    }

    return res.redirect(urlsToTry[0] || originalUrl);
  }
);
