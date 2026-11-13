import { Request, Response } from "express";
import mongoose from "mongoose";
import WinterCampRegistration, {
  WinterCampStatus,
} from "../models/WinterCampRegistration";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import Order from "../models/Order";
import EventModel from "../models/Event";
import { invalidateEventCaches, invalidateOrderCaches } from "../utils/cache.utils";
import logger from "../config/logger";
import { emailService } from "../services/email.service";
import { config } from "../config/env";

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
      email,
      studentEmail,
      parentEmail,
      phone,
      parentPhone,
      grade,
      city,
      selectedPrograms,
      eventIds,
      interests,
      message,
    } = req.body;

    const resolvedEmail = (email || studentEmail || parentEmail || "").trim().toLowerCase();
    const resolvedPhone = (phone || parentPhone || "").trim();

    if (!studentName || !resolvedEmail || !grade) {
      res.status(400).json({
        success: false,
        message: "Student name, email, and grade are required.",
      });
      return;
    }

    const registration = await WinterCampRegistration.create({
      studentName: studentName.trim(),
      studentEmail: studentEmail?.trim().toLowerCase() || resolvedEmail,
      parentEmail: parentEmail?.trim().toLowerCase() || resolvedEmail,
      parentPhone: resolvedPhone || undefined,
      grade: grade.trim(),
      city: city ? city.trim() : undefined,
      selectedPrograms: Array.isArray(selectedPrograms) ? selectedPrograms : [],
      interests: Array.isArray(interests) ? interests : [],
      message: message ? message.trim() : undefined,
      status: WinterCampStatus.PENDING,
    });

    // ── Background Tasks: Account Creation, Order Logging, and Confirmation Email ──
    (async () => {
      try {
        const studentFullName = studentName.trim();
        const userEmail = resolvedEmail;
        const nameParts = studentFullName.split(/\s+/);
        const firstName = nameParts[0] || "Student";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        // 1. Resolve or Create User
        let user = await User.findOne({ email: userEmail });
        let isNewUser = false;
        let tempPassword = "";

        if (!user) {
          isNewUser = true;
          tempPassword = Math.random().toString(36).slice(-8) + "!1A";
          user = await User.create({
            firstName,
            lastName,
            email: userEmail,
            phone: resolvedPhone || undefined,
            passwordHash: tempPassword,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          });
        }

        // Link student profile if not exists
        let student = await Student.findOne({
          parentUserId: user._id,
          firstName,
          lastName: lastName || "Student",
        });
        if (!student) {
          await Student.create({
            parentUserId: user._id,
            email: userEmail,
            firstName,
            lastName: lastName || "Student",
            grade: grade.trim(),
            phone: resolvedPhone || undefined,
          });
        }

        // 2. Create Order in /admin/orders with AED 0 (free registration) & link to Events
        try {
          const coursesList = (Array.isArray(selectedPrograms) && selectedPrograms.length > 0)
            ? selectedPrograms.join(", ")
            : "Winter Camp 2026";

          // Resolve matching events from database
          const requestedTitles = Array.isArray(selectedPrograms) ? selectedPrograms : [];
          const validEventIds = (Array.isArray(eventIds) ? eventIds : [])
            .filter((id: any) => id && mongoose.Types.ObjectId.isValid(String(id)))
            .map((id: any) => new mongoose.Types.ObjectId(String(id)));

          const orConditions: any[] = [];
          if (validEventIds.length > 0) {
            orConditions.push({ _id: { $in: validEventIds } });
          }
          if (requestedTitles.length > 0) {
            orConditions.push({ title: { $in: requestedTitles } });
          }

          let matchedEvents: any[] = [];
          if (orConditions.length > 0) {
            matchedEvents = await EventModel.find({
              $or: orConditions,
              isDeleted: false,
            });
          }

          // Build order items
          const orderItems: any[] = [];
          const updatedEventIds: string[] = [];

          if (matchedEvents.length > 0) {
            for (const ev of matchedEvents) {
              const schedule = Array.isArray(ev.dateSchedule) && ev.dateSchedule.length > 0
                ? ev.dateSchedule[0]
                : null;
              const scheduleDate = schedule?.startDate || schedule?.date || new Date();

              orderItems.push({
                eventId: ev._id,
                scheduleId: schedule?._id || undefined,
                eventTitle: ev.title,
                scheduleDate: new Date(scheduleDate),
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
                currency: ev.currency || "AED",
                participants: [
                  {
                    name: studentFullName,
                    age: 0,
                  },
                ],
              });

              // Reduce available seat and increment sold seat on the event schedule
              try {
                if (schedule?._id) {
                  const currentAvailable = Number(schedule.availableSeats ?? 0);
                  const currentSold = Number(schedule.soldSeats ?? 0);
                  const isUnlimited = Boolean(schedule.unlimitedSeats || schedule.isUnlimited);

                  const nextAvailable = isUnlimited
                    ? 999999
                    : Math.max(0, currentAvailable - 1);
                  const nextSold = currentSold + 1;

                  await EventModel.findOneAndUpdate(
                    {
                      _id: ev._id,
                      "dateSchedule._id": schedule._id,
                    },
                    {
                      $set: {
                        "dateSchedule.$.soldSeats": nextSold,
                        "dateSchedule.$.availableSeats": nextAvailable,
                      },
                    }
                  );
                } else if (typeof ev.availableSpots === "number") {
                  await EventModel.findByIdAndUpdate(ev._id, {
                    $inc: { availableSpots: -1 },
                  });
                }
                updatedEventIds.push(ev._id.toString());
              } catch (seatErr) {
                logger.warn(`[winter-camp] Failed to update seats for event ${ev._id}:`, seatErr);
              }
            }
          } else {
            // Fallback: If no event matched in the DB, keep generic order item
            orderItems.push({
              eventId: new mongoose.Types.ObjectId(registration._id.toString()),
              eventTitle: `Winter Camp 2026 — ${coursesList}`,
              scheduleDate: new Date(),
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
              currency: "AED",
              participants: [
                {
                  name: studentFullName,
                  age: 0,
                },
              ],
            });
          }

          await Order.create({
            userId: user._id,
            items: orderItems,
            subtotal: 0,
            vat: 0,
            discount: 0,
            total: 0,
            currency: "AED",
            chargedCurrency: "AED",
            chargedAmount: 0,
            status: "confirmed",
            paymentStatus: "free",
            paymentMethod: "free",
            transactionId: `WC-${registration._id.toString().slice(-8).toUpperCase()}`,
            billingAddress: {
              firstName: user.firstName,
              lastName: user.lastName || "User",
              email: userEmail,
              phone: resolvedPhone || "N/A",
              address: city ? city.trim() : "TBD",
              city: city ? city.trim() : "Dubai",
              state: "AE",
              zipCode: "00000",
              country: "AE",
            },
            notes: `Winter Camp Registration — Student: ${studentFullName} | Courses: ${coursesList}`,
            paymentRouting: {
              usesVendorStripe: false,
              platformCommission: 0,
              vendorPayout: 0,
              stripeApplicationFee: 0,
            },
            adminCommission: {
              rate: 100,
              amount: 0,
            },
          });

          // Invalidate caches so the event details page instantly reflects updated seats and orders
          for (const evId of updatedEventIds) {
            await invalidateEventCaches(evId);
          }
          await invalidateOrderCaches(user._id.toString());
        } catch (orderErr) {
          logger.error("[winter-camp] Error creating free order record:", orderErr);
        }

        // 3. Send Credentials Email if New User
        if (isNewUser) {
          try {
            const welcomeHtml = `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to KidRove</title></head>
              <body style="font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px;background:#f8fafc;">
                <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                  <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);padding:40px 30px;text-align:center;">
                    <div style="font-size:42px;margin-bottom:12px;">❄️</div>
                    <h1 style="margin:0;color:white;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Welcome to KidRove!</h1>
                    <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your account is ready for Winter Camp 2026!</p>
                  </div>
                  <div style="padding:40px 35px;">
                    <p style="font-size:16px;color:#374151;line-height:1.7;margin-top:0;">Hi <strong>${user.firstName}</strong>,</p>
                    <p style="font-size:15px;color:#4b5563;line-height:1.7;">
                      Thank you for submitting your registration for <strong>KidRove Winter Camp 2026</strong>. An account has been created for you so you can access your dashboard and track your workshop enrollments.
                    </p>
                    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-left:4px solid #0284c7;border-radius:12px;padding:24px;margin:28px 0;">
                      <p style="margin:0 0 5px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#0369a1;">Your Login Credentials</p>
                      <table style="width:100%;border-collapse:collapse;margin-top:14px;">
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px dashed #bae6fd;color:#64748b;font-size:13px;font-weight:600;width:45%;">Login Email</td>
                          <td style="padding:10px 0;border-bottom:1px dashed #bae6fd;color:#0f172a;font-size:13px;font-weight:700;">${userEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:600;">Temporary Password</td>
                          <td style="padding:10px 0;"><code style="background:#0f172a;color:#38bdf8;padding:4px 10px;border-radius:6px;font-size:13px;letter-spacing:1px;">${tempPassword}</code></td>
                        </tr>
                      </table>
                    </div>
                    <div style="text-align:center;margin:30px 0;">
                      <a href="${config.frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(2,132,199,0.3);">Login & Change Password →</a>
                    </div>
                    <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-top:24px;border:1px solid #e2e8f0;">
                      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                        💬 <strong>Have any queries?</strong> Contact the Kidrove team anytime on WhatsApp:
                        <a href="https://wa.me/971529881170" style="color:#0284c7;font-weight:700;text-decoration:none;"> +971 52 988 1170</a> or reply to this email.
                      </p>
                    </div>
                  </div>
                  <div style="background:#0f172a;padding:25px;text-align:center;">
                    <span style="font-weight:800;font-size:16px;color:white;letter-spacing:1px;">KIDROVE</span>
                    <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;">Inspiring the creators of tomorrow.</p>
                  </div>
                </div>
              </body>
              </html>
            `;

            await emailService.sendEmail({
              to: userEmail,
              subject: "Welcome to KidRove — Your Login Credentials",
              html: welcomeHtml,
              text: `Welcome to KidRove, ${user.firstName}!\n\nYour account has been created for Winter Camp 2026.\nLogin Email: ${userEmail}\nTemporary Password: ${tempPassword}\nLogin: ${config.frontendUrl}/login\n\nIf you have any queries, contact the Kidrove team on WhatsApp at +971 52 988 1170.`,
              notificationType: "essential",
            });
          } catch (credErr) {
            logger.error("[winter-camp] Error sending credentials email:", credErr);
          }
        }

        // 4. Send Registration Confirmation Email
        try {
          const selectedCoursesStr = (Array.isArray(selectedPrograms) && selectedPrograms.length > 0)
            ? selectedPrograms.map(p => `<li style="margin-bottom:6px;color:#0f172a;font-weight:600;">${p}</li>`).join("")
            : `<li style="color:#64748b;">General Interest</li>`;

          const confirmationHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Winter Camp Registration Received</title></head>
            <body style="font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px;background:#f8fafc;">
              <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);padding:40px 30px;text-align:center;">
                  <div style="font-size:42px;margin-bottom:12px;">❄️</div>
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Winter Camp Registration Submitted!</h1>
                  <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">We have received your form successfully.</p>
                </div>
                <div style="padding:40px 35px;">
                  <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-top:0;">Hi ${studentFullName}!</h2>
                  <p style="font-size:15px;color:#475569;line-height:1.7;">
                    Thank you for submitting your Winter Camp 2026 registration! Our team is reviewing your preferences and will be in touch with you shortly.
                  </p>
                  
                  <div style="background:#f8fafc;border-radius:16px;padding:24px;margin:28px 0;border:1px solid #e2e8f0;border-left:4px solid #0284c7;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;font-weight:800;margin-bottom:14px;display:block;">Registration Details</span>
                    <table style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#64748b;font-weight:600;font-size:14px;width:40%;">Student Name</td>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#0f172a;font-weight:800;font-size:14px;text-align:right;">${studentFullName}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#64748b;font-weight:600;font-size:14px;">Grade</td>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#0f172a;font-weight:800;font-size:14px;text-align:right;">${grade}</td>
                      </tr>
                      ${city ? `
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#64748b;font-weight:600;font-size:14px;">City</td>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#0f172a;font-weight:800;font-size:14px;text-align:right;">${city}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#64748b;font-weight:600;font-size:14px;">Registration Fee</td>
                        <td style="padding:10px 0;border-bottom:1px dashed #cbd5e1;color:#0284c7;font-weight:800;font-size:14px;text-align:right;">AED 0 (Free Registration)</td>
                      </tr>
                    </table>
                  </div>

                  <div style="margin:25px 0;">
                    <h3 style="font-size:15px;color:#0f172a;font-weight:800;margin-bottom:10px;">Selected Course(s) of Interest:</h3>
                    <ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.7;">
                      ${selectedCoursesStr}
                    </ul>
                  </div>

                  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:20px;margin-top:30px;">
                    <h4 style="margin:0 0 8px 0;color:#0369a1;font-weight:800;font-size:15px;">💬 Need Help or Have Queries?</h4>
                    <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
                      If you have any questions, our support team is happy to help you! You can reach us directly on WhatsApp at 
                      <a href="https://wa.me/971529881170" style="color:#0284c7;font-weight:800;text-decoration:none;">+971 52 988 1170</a> 
                      or email <a href="mailto:contact@kidrove.com" style="color:#0284c7;font-weight:700;">contact@kidrove.com</a>.
                    </p>
                  </div>
                </div>

                <div style="background:#0f172a;padding:25px;text-align:center;color:#94a3b8;font-size:12px;">
                  <span style="font-weight:800;font-size:16px;color:white;letter-spacing:1px;">KIDROVE</span>
                  <p style="margin:6px 0 0;">Inspiring the creators of tomorrow.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          await emailService.sendEmail({
            to: userEmail,
            subject: "❄️ Winter Camp 2026 Registration Received — KidRove",
            html: confirmationHtml,
            text: `Hi ${studentFullName},\n\nYour Winter Camp 2026 registration has been received successfully!\nGrade: ${grade}\n${city ? `City: ${city}\n` : ""}Course(s) of Interest: ${(selectedPrograms || []).join(", ") || "General Interest"}\nFee: AED 0\n\nIf you have any queries, feel free to contact the Kidrove team on WhatsApp at +971 52 988 1170.\n\nKidRove Team`,
            notificationType: "essential",
          });
        } catch (confErr) {
          logger.error("[winter-camp] Error sending confirmation email:", confErr);
        }
      } catch (bgErr) {
        logger.error("[winter-camp] Error in background registration processing:", bgErr);
      }
    })();

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
        { city: { $regex: q, $options: "i" } },
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

