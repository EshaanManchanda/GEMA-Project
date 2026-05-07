import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import {
  Order,
  User,
  Ticket,
  Vendor,
  Teacher,
  Registration,
  RegistrationStatus,
  RegistrationPaymentStatus,
} from "../models/index";
import EventModel from "../models/Event";
import AdminRevenueSettings from "../models/AdminRevenueSettings";
import { AppError } from "../middleware/index";
import { PaymentService } from "../services/payment.service";
import { logger } from "../config/index";
import redisClient from "../config/redis";
import { generateQRCode, generateSecureQRData } from "../utils/qrcode";
import { TicketGenerationService } from "../services/ticketGeneration.service";
import { CouponService } from "../services/coupon.service";
import { emailService } from "../services/email.service";
import { v4 as uuidv4 } from "uuid";

// Helper function to generate a unique ticket number
const generateUniqueTicketNumber = async (): Promise<string> => {
  let ticketNumber: string = "";
  let isUnique = false;
  while (!isUnique) {
    ticketNumber = uuidv4();
    const existingTicket = await Ticket.findOne({ ticketNumber }).lean(); // ✅ Read-only uniqueness check
    if (!existingTicket) {
      isUnique = true;
    }
  }
  return ticketNumber;
};

// @desc    Initiate booking with Stripe payment session
// @route   POST /api/bookings/initiate
// @access  Private
export const initiateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    // Handle both _id (MongoDB native) and id (formatted) properties
    const userId = req.user?._id?.toString() || req.user?.id;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const {
      eventId,
      dateScheduleId,
      seats,
      paymentMethod = "stripe",
      participants,
      couponCode,
    } = req.body;

    const IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

    // Parallel: fetch event + user + adminSettings + idempotency check (~100ms vs ~400ms sequential)
    const [event, user, adminSettings, recentOrder] = await Promise.all([
      EventModel.findOne({ _id: eventId, isApproved: true, isDeleted: false }),
      User.findById(userId)
        .select("firstName lastName email phone addresses")
        .lean(),
      AdminRevenueSettings.findOne({}).lean(),
      Order.findOne({
        userId,
        "items.eventId": eventId,
        status: { $in: ["pending", "confirmed"] },
        createdAt: { $gte: new Date(Date.now() - IDEMPOTENCY_WINDOW_MS) },
      }).lean(),
    ]);

    if (!event) {
      return next(new AppError("Event not found or not available", 404));
    }

    // Idempotency: return existing recent order BEFORE reserving seats
    if (recentOrder) {
      const orderAny = recentOrder as any;
      logger.info("Returning existing order (idempotency)", {
        existingOrderId: orderAny._id,
        status: orderAny.status,
        userId,
        eventId,
      });
      return res.status(200).json({
        success: true,
        message:
          orderAny.status === "confirmed"
            ? "Booking already confirmed"
            : "Using existing pending booking",
        data: {
          bookingId: orderAny.orderNumber,
          orderId: orderAny._id,
          paymentIntentId: orderAny.paymentIntentId,
          clientSecret: orderAny.paymentIntentClientSecret ?? null,
          amount: orderAny.total,
          subtotal: orderAny.subtotal,
          serviceFee: orderAny.serviceFee,
          serviceFeeRate: orderAny.serviceFeeRate,
          tax: orderAny.tax,
          taxRate: orderAny.taxRate,
          couponDiscount: orderAny.couponDiscount || 0,
          currency: orderAny.currency || "AED",
          alreadyConfirmed: orderAny.status === "confirmed",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    }

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Find the specific date schedule
    const schedule = event.dateSchedule.find(
      (s: any) => s._id.toString() === dateScheduleId,
    );

    if (!schedule) {
      return next(new AppError("Event schedule not found", 404));
    }

    // Get schedule date (handle both legacy 'date' field and new 'startDate' field)
    const scheduleDate = schedule.startDate || schedule.date;
    if (!scheduleDate) {
      logger.error("Schedule date is missing from schedule object", {
        scheduleId: dateScheduleId,
        schedule: {
          _id: schedule._id,
          date: schedule.date,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          availableSeats: schedule.availableSeats,
        },
      });
      return next(new AppError("Schedule date is invalid", 400));
    }

    // Validate that scheduleDate is a valid date
    const parsedScheduleDate = new Date(scheduleDate);
    if (isNaN(parsedScheduleDate.getTime())) {
      logger.error("Schedule date is not a valid date", {
        scheduleId: dateScheduleId,
        scheduleDate,
        scheduleType: typeof scheduleDate,
      });
      return next(new AppError("Schedule date format is invalid", 400));
    }

    logger.info("Schedule date validation passed", {
      scheduleId: dateScheduleId,
      scheduleDate: parsedScheduleDate.toISOString(),
      originalScheduleDate: scheduleDate,
    });

    // Atomically reserve seats (skip for unlimited)
    if (!schedule.unlimitedSeats) {
      const seatResult = await EventModel.findOneAndUpdate(
        {
          _id: eventId,
          "dateSchedule._id": dateScheduleId,
          "dateSchedule.availableSeats": { $gte: seats },
        },
        { $inc: { "dateSchedule.$.availableSeats": -seats } },
        { new: true },
      );

      if (!seatResult) {
        return next(
          new AppError(
            `Only ${schedule.availableSeats} seats available for this date`,
            400,
          ),
        );
      }
    } else {
      logger.info("Unlimited seats event - skipping capacity check", {
        eventId,
        scheduleId: dateScheduleId,
        requestedSeats: seats,
      });
    }

    // Get payment routing info to determine if service fee applies
    // TeachingEvents use teacherId, regular Events use vendorId
    const vendorOrTeacherId =
      (event as any).teacherId || (event as any).vendorId;

    if (!vendorOrTeacherId) {
      logger.error("Event missing both teacherId and vendorId", {
        eventId: event._id,
        eventTitle: event.title,
      });
      return next(new AppError("Event configuration error", 500));
    }

    const paymentRouting = await PaymentService.getPaymentRouting(
      vendorOrTeacherId.toString(),
      0,
    );

    // adminSettings already fetched in parallel above
    const serviceFeeRate = paymentRouting.usesVendorStripe
      ? 0
      : adminSettings?.defaultCommissionRate || 5;
    const taxRate = adminSettings?.taxSettings?.vatRate || 5;

    // Calculate total amount (all in AED)
    const unitPrice = schedule.price || event.price;
    const subtotal = unitPrice * seats;

    // Free event: skip payment and coupon entirely.
    // Also treat as free when paymentMethod is 'free' (sent by frontend for price=0 events)
    // or when total would be 0 — prevents Stripe rejecting a 0 AED payment intent.
    const isFreeEvent = !!(event as any).isFreeEvent || paymentMethod === "free";

    // Validate and apply coupon if provided (skip for free events)
    let couponDiscount = 0;
    let validatedCouponCode: string | undefined;
    if (couponCode && !isFreeEvent) {
      try {
        const couponResult = await CouponService.validateCoupon(
          couponCode,
          userId,
          subtotal,
          [eventId],
        );
        couponDiscount = couponResult.discountAmount;
        validatedCouponCode = couponResult.coupon.code;
      } catch (couponError: any) {
        // Restore seats if coupon validation fails
        if (!schedule.unlimitedSeats) {
          await EventModel.findOneAndUpdate(
            { _id: eventId, "dateSchedule._id": dateScheduleId },
            { $inc: { "dateSchedule.$.availableSeats": seats } },
          );
        }
        return next(
          new AppError(
            couponError.message || "Invalid coupon code",
            couponError.statusCode || 400,
          ),
        );
      }
    }

    const serviceFee = isFreeEvent
      ? 0
      : (subtotal - couponDiscount) * (serviceFeeRate / 100);
    const tax = isFreeEvent
      ? 0
      : (subtotal - couponDiscount + serviceFee) * (taxRate / 100);
    const total = isFreeEvent
      ? 0
      : subtotal - couponDiscount + tax + serviceFee;

    // Use Mongoose transaction for order + payment intent
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create order with pending status
      const tempOrder = new Order({
        userId,
        items: [
          {
            eventId,
            eventTitle: event.title,
            scheduleDate: parsedScheduleDate,
            quantity: seats,
            unitPrice,
            totalPrice: subtotal,
            currency: "AED",
            participants: participants || [],
          },
        ],
        subtotal,
        tax,
        serviceFee,
        serviceFeeRate,
        taxRate,
        total,
        currency: "AED",
        chargedCurrency: "AED",
        chargedAmount: total,
        couponCode: validatedCouponCode,
        couponDiscount,
        status: "pending",
        paymentStatus: "pending",
        paymentMethod,
        paymentRouting: {
          usesVendorStripe: paymentRouting.usesVendorStripe,
          vendorStripeAccountId: paymentRouting.vendorStripeAccountId,
          platformCommission: paymentRouting.platformCommission,
          vendorPayout: paymentRouting.vendorPayout,
          stripeApplicationFee: 0,
        },
        billingAddress: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || user.email,
          address: user.addresses?.[0]?.street || "TBD",
          city: user.addresses?.[0]?.city || "TBD",
          state: user.addresses?.[0]?.state || "TBD",
          zipCode: user.addresses?.[0]?.zipCode || "00000",
          country: user.addresses?.[0]?.country || "UAE",
        },
        source: "web",
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });

      await tempOrder.save({ session });

      // Create payment session
      let paymentSession: any;

      if (isFreeEvent) {
        // Free event: no payment intent needed – auto-confirm immediately
        paymentSession = {
          paymentIntentId: `free_pi_${tempOrder._id}`,
          clientSecret: `free_pi_${tempOrder._id}_secret`,
        };
      } else if (paymentMethod === "test") {
        paymentSession = {
          paymentIntentId: `test_pi_${tempOrder._id}`,
          clientSecret: `test_pi_${tempOrder._id}_secret`,
        };
      } else {
        paymentSession = await PaymentService.createPaymentIntent({
          amount: total,
          currency: "AED",
          orderId: tempOrder._id.toString(),
          vendorId: vendorOrTeacherId.toString(),
          metadata: {
            orderId: tempOrder._id.toString(),
            eventId,
            scheduleId: dateScheduleId,
            seats: seats.toString(),
            userId,
          },
        });
      }

      // Update order with payment intent ID and client secret
      tempOrder.paymentIntentId = paymentSession.paymentIntentId;
      (tempOrder as any).paymentIntentClientSecret = paymentSession.clientSecret ?? null;
      await tempOrder.save({ session });

      await session.commitTransaction();

      // Set Redis seat hold with 15-min TTL for cleanup
      if (redisClient && !schedule.unlimitedSeats) {
        const SEAT_HOLD_TTL = 900; // 15 minutes
        await redisClient.set(
          `seat-hold:${tempOrder._id}`,
          JSON.stringify({ eventId, dateScheduleId, seats }),
          "EX",
          SEAT_HOLD_TTL,
        );
      }

      logger.info("Booking initiated successfully", {
        orderId: tempOrder._id,
        eventId,
        userId,
        amount: total,
      });

      res.status(201).json({
        success: true,
        message: "Booking initiated successfully",
        data: {
          bookingId: tempOrder.orderNumber,
          orderId: tempOrder._id,
          paymentIntentId: paymentSession.paymentIntentId,
          clientSecret: paymentSession.clientSecret,
          amount: total,
          subtotal,
          serviceFee,
          serviceFeeRate,
          tax,
          taxRate,
          couponCode: validatedCouponCode,
          couponDiscount,
          currency: "AED",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min (matches seat hold)
        },
      });
    } catch (txError) {
      await session.abortTransaction();

      // Restore seats on failure
      if (!schedule.unlimitedSeats) {
        await EventModel.findOneAndUpdate(
          { _id: eventId, "dateSchedule._id": dateScheduleId },
          { $inc: { "dateSchedule.$.availableSeats": seats } },
        );
      }

      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error("Error initiating booking:", error);
    return next(new AppError("Failed to initiate booking", 500));
  }
};

// @desc    Confirm booking after successful payment
// @route   POST /api/bookings/confirm
// @access  Private
export const confirmBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { paymentIntentId, orderId, participants } = req.body;

    logger.info("Starting booking confirmation", {
      paymentIntentId: paymentIntentId?.substring(0, 20) + "...",
      orderId,
      userId: req.user?._id?.toString() || req.user?.id,
    });

    // Validate required fields
    if (!paymentIntentId || !orderId) {
      logger.error("Missing required fields for booking confirmation", {
        hasPaymentIntentId: !!paymentIntentId,
        hasOrderId: !!orderId,
      });
      return next(
        new AppError("Payment intent ID and order ID are required", 400),
      );
    }

    const order = await Order.findById(orderId).populate("items.eventId");
    if (!order) {
      logger.error("Order not found for confirmation", { orderId });
      return next(new AppError("Order not found", 404));
    }

    logger.info("Order found for confirmation", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
    });

    // Idempotency: if already confirmed, return success immediately
    if (
      order.status === "confirmed" &&
      (order.paymentStatus === "paid" || order.paymentStatus === "free")
    ) {
      logger.info("Order already confirmed, returning idempotent success", {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
      return res.status(200).json({
        success: true,
        message: "Booking already confirmed",
        data: {
          bookingId: order.orderNumber,
          eventTitle: order.items[0]?.eventTitle,
          date: order.items[0]?.scheduleDate,
          seats: order.items.reduce((sum, item) => sum + item.quantity, 0),
          amountPaid: order.total,
          currency: order.currency,
          status: order.status,
          paymentStatus: order.paymentStatus,
          tickets: [],
        },
      });
    }

    // Verify payment based on payment method
    let paymentIntent: any;

    if (paymentIntentId.startsWith("free_pi_")) {
      // Free event: auto-confirm without payment
      logger.info("Processing free event booking confirmation", {
        paymentIntentId: paymentIntentId.substring(0, 30) + "...",
        orderId: order._id,
      });
      paymentIntent = {
        id: paymentIntentId,
        status: "succeeded",
        payment_method: "free",
      };
    } else if (paymentIntentId.startsWith("test_pi_")) {
      // For test payments, create a mock successful payment intent
      logger.info("Processing test payment confirmation", {
        paymentIntentId: paymentIntentId.substring(0, 30) + "...",
        orderId: order._id,
      });
      paymentIntent = {
        id: paymentIntentId,
        status: "succeeded",
        payment_method: "test",
      };
    } else {
      // Verify payment with Stripe for real payments
      logger.info("Verifying Stripe payment intent", {
        paymentIntentId: paymentIntentId.substring(0, 20) + "...",
      });

      try {
        paymentIntent = await PaymentService.getPaymentIntent(paymentIntentId);
        logger.info("Stripe payment intent retrieved", {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
      } catch (error) {
        logger.error("Failed to retrieve payment intent from Stripe", {
          error: error.message,
          paymentIntentId: paymentIntentId.substring(0, 20) + "...",
        });
        return next(
          new AppError(
            "Failed to verify payment. Please contact support.",
            500,
          ),
        );
      }

      if (paymentIntent.status !== "succeeded") {
        logger.warn("Payment intent not in succeeded status", {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          orderId: order._id,
        });
        return next(
          new AppError(
            `Payment not completed. Status: ${paymentIntent.status}. Please try again or contact support.`,
            400,
          ),
        );
      }
    }

    // Update order status via updateOne to bypass schema validation
    // (participants[].age required constraint would fail on old orders)
    const newPaymentStatus =
      paymentIntent.payment_method === "free" ? "free" : "paid";

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "confirmed",
          paymentStatus: newPaymentStatus,
          confirmedAt: new Date(),
          transactionId: paymentIntent.id,
        },
      },
    );

    // Sync in-memory object for downstream use (emails, tickets)
    order.status = "confirmed";
    order.paymentStatus = newPaymentStatus;
    order.transactionId = paymentIntent.id;

    // Persist participant data via direct update (bypasses schema validation
    // so optional fields like age don't block the confirmation)
    if (
      participants &&
      Array.isArray(participants) &&
      participants.length > 0
    ) {
      const participantUpdate: any = {};
      order.items.forEach((_: any, i: number) => {
        participantUpdate[`items.${i}.participants`] = participants;
      });
      await Order.updateOne({ _id: order._id }, { $set: participantUpdate });
    }

    // Clear seat hold from Redis (seats are now permanently committed)
    if (redisClient) {
      await redisClient.del(`seat-hold:${order._id}`);
    }

    // Create Registration records for participants if event has registrationConfig enabled
    // This persists the dynamic custom field data collected during the booking flow
    try {
      const eventDoc = order.items[0]?.eventId as any;
      const hasRegistrationConfig = eventDoc?.registrationConfig?.enabled;

      if (
        hasRegistrationConfig &&
        participants &&
        Array.isArray(participants) &&
        participants.length > 0
      ) {
        const userId = req.user?._id?.toString() || req.user?.id;
        const requiresApproval =
          eventDoc.registrationConfig?.requiresApproval || false;
        const isFreeBooking = order.total === 0;

        const registrationStatus = requiresApproval
          ? RegistrationStatus.UNDER_REVIEW
          : RegistrationStatus.APPROVED;

        // Batch: single check + insertMany instead of N+N queries
        const existingReg = await Registration.findOne({
          eventId: eventDoc._id,
          userId,
          status: {
            $nin: [RegistrationStatus.WITHDRAWN, RegistrationStatus.REJECTED],
          },
        })
          .select("_id")
          .lean();

        if (!existingReg) {
          const regDocs = participants.map((participant: any) => ({
            eventId: eventDoc._id,
            userId,
            registrationData: participant.registrationData || [],
            files: [],
            payment: {
              status: RegistrationPaymentStatus.PAID,
              amount: order.total,
              currency: order.currency || "AED",
            },
            status: registrationStatus,
            metadata: {
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
              submittedAt: new Date(),
              lastModifiedAt: new Date(),
            },
          }));

          const inserted = await Registration.insertMany(regDocs);
          logger.info("Registration records created from booking", {
            count: inserted.length,
            orderId: order._id,
            eventId: eventDoc._id,
            status: registrationStatus,
          });
        }
      }
    } catch (regError: any) {
      // Non-fatal: log but don't fail the booking confirmation
      logger.warn("Failed to create registration record (non-blocking)", {
        orderId: order._id,
        error: regError.message,
      });
    }

    // Verify order was saved with correct payment status
    logger.info("Order saved successfully with payment status", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      confirmedAt: order.confirmedAt,
    });

    // Generate tickets using the centralized service
    logger.info(
      "Starting ticket generation process using TicketGenerationService",
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
      },
    );

    let ticketResult: Awaited<ReturnType<typeof TicketGenerationService.generateTicketsForOrder>>;
    try {
      ticketResult = await TicketGenerationService.generateTicketsForOrder(
        order._id.toString(),
        {
          sendEmail: true,
          skipExisting: false,
        },
      );
    } catch (ticketErr: any) {
      logger.error("Ticket generation threw an exception (non-blocking)", {
        orderId: order._id,
        error: ticketErr?.message,
      });
      ticketResult = { success: false, tickets: [], errors: [ticketErr?.message], totalGenerated: 0 };
    }

    const tickets = ticketResult.tickets.map((ticket) => ({
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      qrCodeUrl: ticket.qrCodeImage,
      status: ticket.status,
    }));

    if (!ticketResult.success && ticketResult.errors.length > 0) {
      logger.warn("Some tickets failed to generate", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        errors: ticketResult.errors,
        successfulTickets: ticketResult.totalGenerated,
      });
    } else {
      logger.info("Ticket generation completed successfully", {
        orderId: order._id,
        totalTicketsGenerated: ticketResult.totalGenerated,
      });
    }

    // Send vendor booking notification email
    logger.info("Sending vendor booking notification email", {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });

    try {
      // Get vendor information and event details
      const firstItem = order.items[0];
      const event = firstItem.eventId as any; // already populated via Order.findById(...).populate

      if (event && (event.vendorId || event.teacherId)) {
        let vendorName = "Vendor";
        let vendorEmail = "";

        // Determine role based on event type or teacher presence
        let role = "Vendor";
        const teachingTypes = [
          "Course",
          "Workshop",
          "Class",
          "Bootcamp",
          "Masterclass",
        ];
        if (
          (event.type && teachingTypes.includes(event.type)) ||
          event.teacherId
        ) {
          role = "Instructor";
        }

        // Parallel: fetch teacher + vendor + customer (~2x faster)
        const [teacher, vendor, customer] = await Promise.all([
          event.teacherId
            ? Teacher.findById(event.teacherId).lean()
            : Promise.resolve(null),
          event.vendorId
            ? Vendor.findById(event.vendorId).lean()
            : Promise.resolve(null),
          User.findById(order.userId).lean(),
        ]);

        if (teacher) {
          vendorEmail = (teacher as any).email;
          vendorName = (teacher as any).fullName;
        }

        if (!vendorEmail && vendor) {
          vendorEmail = (vendor as any).email;
          vendorName =
            (vendor as any).contactPerson?.name ||
            (vendor as any).businessName ||
            "Vendor";
        }

        if (vendorEmail && customer) {
          // Format participants data for email
          const participants = [];
          for (const item of order.items) {
            if (item.participants && item.participants.length > 0) {
              item.participants.forEach((p: any) => {
                participants.push({
                  name: p.name,
                  email: customer.email,
                  phone: p.phone || customer.phone,
                  age: p.age,
                  gender: p.gender,
                  registrationData: p.registrationData || [],
                });
              });
            }
          }

          // If no participants in order items, create default from customer info
          if (participants.length === 0) {
            const totalQuantity = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            for (let i = 0; i < totalQuantity; i++) {
              participants.push({
                name: `${customer.firstName} ${customer.lastName}`,
                email: customer.email,
                phone: customer.phone,
                age: undefined,
                gender: undefined,
                registrationData: [],
              });
            }
          }

          // Send customer order confirmation email
          await emailService.sendOrderConfirmationEmail({
            to: customer.email,
            firstName: customer.firstName,
            orderNumber: order.orderNumber,
            orderTotal: order.total,
            currency: order.currency,
            isFreeEvent: !!(event as any).isFreeEvent,
            items: order.items.map((item: any) => ({
              eventTitle: item.eventTitle || event.title,
              quantity: item.quantity,
              price: item.unitPrice,
              date: item.scheduleDate,
              venueType: event.venueType,
              eventType: (event as any).eventType || event.type,
              meetingLink: event.meetingLink,
              meetingPassword: (event as any).meetingPassword,
            })),
          });

          await emailService.sendVendorBookingNotificationEmail({
            to: vendorEmail,
            vendorName: vendorName,
            orderNumber: order.orderNumber,
            eventTitle: event.title,
            eventDate: firstItem.scheduleDate,
            participantCount: participants.length,
            orderTotal: order.total,
            currency: order.currency,
            isFreeEvent: !!(event as any).isFreeEvent,
            participants,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            venueType: event.venueType,
            eventType: (event as any).eventType || event.type,
            meetingLink: event.meetingLink,
            meetingPassword: (event as any).meetingPassword,
            role: role,
          });

          // Log communications
          order.addCommunication(
            "email",
            `Order confirmation sent to customer ${customer.email}`,
            "Customer Order Confirmation",
          );
          order.addCommunication(
            "email",
            `Booking notification sent to vendor ${vendorEmail}`,
            "Vendor Booking Notification",
          );
          await order.save();

          logger.info("Vendor notification email sent successfully", {
            orderId: order._id,
            vendorEmail: vendorEmail,
            orderNumber: order.orderNumber,
          });
        }
      }
    } catch (emailError) {
      // Log error but don't fail the booking
      logger.warn("Failed to send vendor notification email (non-blocking)", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        error: emailError.message,
        stack: emailError.stack,
      });
    }

    logger.info("Booking confirmed successfully", {
      orderId: order._id,
      transactionId: paymentIntent.id,
    });

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
      data: {
        bookingId: order.orderNumber,
        orderId: order._id,
        eventTitle: order.items[0].eventTitle,
        date: order.items[0].scheduleDate,
        seats: order.items.reduce((sum, item) => sum + item.quantity, 0),
        amountPaid: order.total,
        subtotal: (order as any).subtotal || 0,
        serviceFee: (order as any).serviceFee || 0,
        tax: (order as any).tax || 0,
        couponDiscount: (order as any).couponDiscount || 0,
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        tickets,
      },
    });
  } catch (error) {
    logger.error("Error confirming booking:", error);
    return next(new AppError("Failed to confirm booking", 500));
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString() || req.user?.id;

    const orderDoc = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
      userId,
    }).populate({
      path: "items.eventId",
      select:
        "title images imageAssets location dateSchedule venueType meetingLink slug",
      populate: { path: "imageAssets", select: "url thumbnailUrl" },
    });

    if (!orderDoc) {
      return next(new AppError("Booking not found", 404));
    }

    const order = orderDoc.toObject() as any;
    order.items = (order.items || []).map((item: any) => {
      if (item.eventId) {
        const ev = item.eventId;
        const fromAssets =
          ev.imageAssets?.[0]?.url || ev.imageAssets?.[0]?.thumbnailUrl;
        const fromImages = ev.images?.[0];
        ev.coverImage = fromAssets || fromImages || null;
      }
      return item;
    });

    res.status(200).json({
      success: true,
      data: {
        booking: order,
      },
    });
  } catch (error) {
    logger.error("Error fetching booking:", error);
    return next(new AppError("Failed to fetch booking", 500));
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id?.toString() || req.user?.id;

    const order = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
      userId,
    });

    if (!order) {
      return next(new AppError("Booking not found", 404));
    }

    if (order.status === "cancelled") {
      return next(new AppError("Booking is already cancelled", 400));
    }

    // Calculate refund amount based on cancellation policy
    const refundAmount = order.calculateRefundAmount();

    // Cancel the booking
    await order.cancel(reason);

    // Process refund if applicable
    if (refundAmount > 0 && order.paymentIntentId) {
      try {
        await PaymentService.createRefund(
          order.paymentIntentId,
          Math.round(refundAmount * 100), // Convert to cents
          "requested_by_customer",
        );

        order.refundAmount = refundAmount;
        order.refundReason = reason || "Customer request";
        await order.save();
      } catch (refundError) {
        logger.error("Refund processing failed:", refundError);
        // Continue with cancellation even if refund fails
      }
    }

    // Send cancellation confirmation email to customer
    try {
      const customer = (await User.findById(userId).lean()) as any;
      if (customer) {
        await emailService.sendCancellationConfirmationEmail({
          to: customer.email,
          firstName: customer.firstName,
          orderNumber: order.orderNumber,
          refundAmount,
          nonRefundableAmount: order.total - refundAmount,
          serviceFee: (order as any).serviceFee || 0,
          tax: (order as any).tax || 0,
          currency: order.currency,
          reason: reason || "Customer request",
        });
      }
    } catch (emailError: any) {
      logger.warn("Failed to send cancellation email (non-blocking)", {
        orderId: order._id,
        error: emailError?.message,
      });
    }

    logger.info("Booking cancelled", {
      orderId: order._id,
      refundAmount,
      reason,
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: {
        booking: order,
        refundAmount,
      },
    });
  } catch (error) {
    logger.error("Error cancelling booking:", error);
    return next(new AppError("Failed to cancel booking", 500));
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { userId };
    if (status) filter.status = status;

    const sortOption: any = {};
    sortOption[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const bookings = await Order.find(filter)
      .populate({
        path: "items.eventId",
        select:
          "title images imageAssets location dateSchedule venueType meetingLink slug",
        populate: { path: "imageAssets", select: "url thumbnailUrl" },
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    // Normalize: inject a `coverImage` field on each eventId object
    const bookingsLean = bookings.map((booking: any) => {
      const b = booking.toObject ? booking.toObject() : booking;
      b.items = (b.items || []).map((item: any) => {
        if (item.eventId) {
          const ev = item.eventId;
          // Prefer imageAssets (modern), fall back to images[] (legacy strings)
          const fromAssets =
            ev.imageAssets?.[0]?.url || ev.imageAssets?.[0]?.thumbnailUrl;
          const fromImages = ev.images?.[0];
          ev.coverImage = fromAssets || fromImages || null;
        }
        return item;
      });
      return b;
    });

    const total = await Order.countDocuments(filter);
    const leanBookings = bookingsLean;

    res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: {
        bookings: leanBookings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalBookings: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching user bookings:", error);
    return next(new AppError("Failed to fetch bookings", 500));
  }
};
