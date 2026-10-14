import crypto from "crypto";
import { Types } from "mongoose";
import CompetitionSubmission from "../models/CompetitionSubmission";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import { emailService } from "./email.service";
import { config } from "../config/env";
import logger from "../config/logger";
import { escapeHtml } from "../utils/htmlHelpers";

/**
 * Mark a competition entry paid and run the post-payment work (parent
 * account, student record, emails). Called by both the browser finalize
 * step and the Stripe checkout.session.completed webhook; the conditional
 * update makes it run exactly once, whichever arrives first.
 * Returns false when the entry was already paid (nothing done).
 */
export async function activatePaidSubmission(
  submissionId: Types.ObjectId | string,
  sessionId: string,
): Promise<boolean> {
  const submission = await CompetitionSubmission.findOneAndUpdate(
    { _id: submissionId, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", checkoutSessionId: sessionId } },
    { new: true },
  );
  if (!submission) return false;

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
          tempPassword = crypto.randomBytes(9).toString("base64url") + "!1A";

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
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to KidRove</title></head>
            <body style="font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px;background:#f8fafc;">
              <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#f59e0b 0%,#ea580c 100%);padding:40px 30px;text-align:center;">
                  <div style="font-size:42px;margin-bottom:12px;">🎉</div>
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Welcome to KidRove!</h1>
                  <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your account is ready — let's get started!</p>
                </div>
                <!-- Body -->
                <div style="padding:40px 35px;">
                  <p style="font-size:16px;color:#374151;line-height:1.7;margin-top:0;">Hi <strong>${escapeHtml(parent.firstName)}</strong>,</p>
                  <p style="font-size:15px;color:#4b5563;line-height:1.7;">
                    Thank you for registering for the <strong style="color:#ea580c;">KidRove AI Art Competition 2026</strong>. We've created a parent account for you so you can track your child's submission and stay up to date with competition news.
                  </p>
                  <!-- Credentials Box -->
                  <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:12px;padding:24px;margin:28px 0;">
                    <p style="margin:0 0 5px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#92400e;">Your Login Credentials</p>
                    <table style="width:100%;border-collapse:collapse;margin-top:14px;">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px dashed #fde68a;color:#6b7280;font-size:13px;font-weight:600;width:45%;">Login Email</td>
                        <td style="padding:10px 0;border-bottom:1px dashed #fde68a;color:#1f2937;font-size:13px;font-weight:700;">${escapeHtml(parentEmail)}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#6b7280;font-size:13px;font-weight:600;">Temporary Password</td>
                        <td style="padding:10px 0;"><code style="background:#1f2937;color:#f59e0b;padding:4px 10px;border-radius:6px;font-size:13px;letter-spacing:1px;">${tempPassword}</code></td>
                      </tr>
                    </table>
                  </div>
                  <div style="text-align:center;margin:30px 0;">
                    <a href="${config.frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(234,88,12,0.3);">Login & Change Password →</a>
                  </div>
                  <p style="font-size:13px;color:#9ca3af;line-height:1.6;">For any questions or help, feel free to reach us at <a href="mailto:contact@kidrove.com" style="color:#ea580c;">contact@kidrove.com</a>.</p>
                </div>
                <!-- Footer -->
                <div style="background:#1f2937;padding:25px;text-align:center;">
                  <span style="font-weight:800;font-size:16px;color:white;letter-spacing:1px;">KIDROVE</span>
                  <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">Inspiring the creators of tomorrow.</p>
                </div>
              </div>
            </body>
            </html>
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

  return true;
}
