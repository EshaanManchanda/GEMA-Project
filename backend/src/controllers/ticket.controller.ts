import { Request, Response, NextFunction } from "express";
import { Ticket, User, Event, Employee } from "../models/index";
import { AppError } from "../middleware/error";
import { AuthRequest } from "../types/index";
import {
  generateQRCode,
  generateSecureQRData,
  validateQRData,
} from "../utils/qrcode";
import { TicketGenerationService } from "../services/ticketGeneration.service";
import { sendTicketByEmail } from "../utils/mailer";
import { smsService } from "../services/sms.service";
import { v4 as uuidv4 } from "uuid";

// Helper function to generate a unique ticket number
const generateUniqueTicketNumber = async (): Promise<string> => {
  let ticketNumber: string = "";
  let isUnique = false;
  while (!isUnique) {
    ticketNumber = uuidv4(); // Generate a UUID as ticket number
    const existingTicket = await Ticket.findOne({ ticketNumber });
    if (!existingTicket) {
      isUnique = true;
    }
  }
  return ticketNumber;
};

export const generateTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { orderId, attendees, eventId } = req.body;

  if (
    !orderId ||
    !attendees ||
    !Array.isArray(attendees) ||
    attendees.length === 0 ||
    !eventId
  ) {
    return next(
      new AppError(
        "Missing required fields: orderId, attendees, or eventId",
        400,
      ),
    );
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const createdTickets = [];

    for (const attendee of attendees) {
      const { name, email, phone, ticketType, price, currency, seatNumber } =
        attendee;

      // Find or create user based on email
      let user = await User.findOne({ email });
      if (!user) {
        // If user doesn't exist, create a new one (minimal info)
        user = await User.create({
          email,
          firstName: name.split(" ")[0] || "Guest",
          lastName: name.split(" ").slice(1).join(" ") || "",
          role: "customer", // Default role for ticket holders
          status: "ACTIVE",
          isEmailVerified: false, // Mark as unverified, they can verify later
        });
      }

      const ticketNumber = await generateUniqueTicketNumber();
      const qrCodeData = generateSecureQRData({
        ticketNumber,
        eventId,
        userId: user._id.toString(),
        vendorId: event.vendorId.toString(),
        orderNumber: orderId,
        validUntil:
          event.dateSchedule[event.dateSchedule.length - 1]?.date ||
          new Date(Date.now() + 24 * 60 * 60 * 1000),
        seatsAllocated: 1,
      });
      const qrCodeImage = await generateQRCode(qrCodeData, {
        errorCorrectionLevel: "high",
      });

      const newTicket = await Ticket.create({
        ticketNumber,
        orderId,
        userId: user._id,
        eventId,
        vendorId: event.vendorId,
        qrCode: qrCodeData,
        qrCodeImage,
        ticketType,
        seatNumber,
        seatsAllocated: 1,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        price,
        currency,
        status: "active",
        checkInDetails: {
          isCheckedIn: false,
          scanCount: 0,
        },
        validFrom: event.dateSchedule[0]?.date || new Date(), // Use first scheduled date
        validUntil:
          event.dateSchedule[event.dateSchedule.length - 1]?.date || new Date(), // Use last scheduled date
        metadata: {
          generatedBy: user._id,
          ipAddress: orderId, // Using order ID as a placeholder
        },
      });

      createdTickets.push(newTicket);

      // Send digital ticket via email
      await sendTicketByEmail({
        to: email,
        firstName: name,
        eventTitle: event.title,
        ticketNumber,
        qrCode: qrCodeImage,
        eventDate: event.dateSchedule[0]?.date || new Date(),
        venue: `${event.location.address}, ${event.location.city}`,
      });
    }

    res.status(201).json({
      success: true,
      message: "Tickets generated and sent successfully",
      data: createdTickets,
    });
  } catch (error) {
    console.error("Error generating tickets:", error);
    next(new AppError("Failed to generate tickets", 500));
  }
};

export const getTicketDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { ticketId } = req.params;

  try {
    const ticket = await Ticket.findById(ticketId)
      .populate("userId", "firstName lastName email")
      .populate("eventId", "name startDate endDate");

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Ensure only the ticket holder or an authorized employee/admin can view full details
    // This is a basic check, more robust authorization might be needed
    if (
      !req.user ||
      (req.user._id?.toString() !== ticket.userId.toString() &&
        req.user.role !== "admin" &&
        req.user.role !== "vendor")
    ) {
      return next(new AppError("Unauthorized to view this ticket", 403));
    }

    res.status(200).json({
      success: true,
      message: "Ticket details retrieved successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error retrieving ticket details:", error);
    next(new AppError("Failed to retrieve ticket details", 500));
  }
};

export const transferTicket = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { ticketId } = req.params;
  const { toEmail, message } = req.body;

  if (!toEmail) {
    return next(new AppError("Recipient email is required for transfer", 400));
  }

  try {
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Only the current ticket holder can initiate a transfer
    if (!req.user || req.user._id?.toString() !== ticket.userId.toString()) {
      return next(new AppError("Unauthorized to transfer this ticket", 403));
    }

    // Find or create the recipient user
    let toUser = await User.findOne({ email: toEmail });
    if (!toUser) {
      toUser = await User.create({
        email: toEmail,
        firstName: toEmail.split("@")[0] || "Guest",
        lastName: "",
        role: "customer",
        status: "ACTIVE",
        isEmailVerified: false,
      });
    }

    // Update ticket ownership and add to transfer history
    if (!ticket.transferHistory) {
      ticket.transferHistory = [];
    }
    ticket.transferHistory.push({
      fromUserId: ticket.userId,
      toUserId: toUser._id,
      transferredAt: new Date(),
      reason: message,
    });
    ticket.userId = toUser._id; // Assign new owner
    ticket.attendeeEmail = toEmail; // Update attendee email
    ticket.attendeeName = toUser.firstName + " " + toUser.lastName; // Update attendee name
    ticket.status = "active"; // Reset status to active if it was used or cancelled

    // Regenerate QR code for the new owner (optional, but good for security)
    const newQrCodeData = JSON.stringify({
      ticketNumber: ticket.ticketNumber,
      eventId: ticket.eventId,
      userId: toUser._id,
    });
    ticket.qrCode = newQrCodeData;
    ticket.qrCodeImage = await generateQRCode(newQrCodeData);

    await ticket.save();

    // Send notification to new owner (e.g., email with new ticket details)
    const event = await Event.findById(ticket.eventId);
    if (event) {
      await sendTicketByEmail({
        to: toEmail,
        firstName: toUser.firstName,
        eventTitle: event.title,
        ticketNumber: ticket.ticketNumber,
        qrCode: ticket.qrCodeImage,
        eventDate: event.dateSchedule[0]?.date || new Date(),
        venue: `${event.location.address}, ${event.location.city}`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket transferred successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error transferring ticket:", error);
    next(new AppError("Failed to transfer ticket", 500));
  }
};

export const resendTicket = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { ticketId } = req.params;
  const { method } = req.body;

  if (!method || !["email", "sms"].includes(method)) {
    return next(
      new AppError("Invalid resend method. Must be 'email' or 'sms'.", 400),
    );
  }

  try {
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Only the current ticket holder or an authorized employee/admin can resend
    if (
      !req.user ||
      (req.user._id?.toString() !== ticket.userId.toString() &&
        req.user.role !== "admin" &&
        req.user.role !== "vendor")
    ) {
      return next(new AppError("Unauthorized to resend this ticket", 403));
    }

    const event = await Event.findById(ticket.eventId);
    if (!event) {
      return next(new AppError("Associated event not found", 404));
    }

    if (method === "email") {
      await sendTicketByEmail({
        to: ticket.attendeeEmail,
        firstName: ticket.attendeeName,
        eventTitle: event.title,
        ticketNumber: ticket.ticketNumber,
        qrCode: ticket.qrCodeImage,
        eventDate: event.dateSchedule[0]?.date || new Date(),
        venue: `${event.location.address}, ${event.location.city}`,
      });
      res.status(200).json({
        success: true,
        message: "Ticket resent via email successfully",
      });
    } else if (method === "sms") {
      const phone = ticket.attendeePhone;
      if (!phone) {
        return next(new AppError("No phone number on file for this ticket", 400));
      }
      const venue = event.venueType === "Online"
        ? (event.meetingLink || "Online")
        : `${event.location?.address || ""}, ${event.location?.city || ""}`.trim().replace(/^,\s*/, "");
      const result = await smsService.sendTicketViaSMS(
        phone,
        ticket.ticketNumber,
        event.title,
        event.dateSchedule[0]?.date || new Date(),
        venue,
      );
      if (!result.success) {
        return next(new AppError(`SMS delivery failed: ${result.error || "unknown error"}`, 502));
      }
      res.status(200).json({
        success: true,
        message: "Ticket resent via SMS successfully",
      });
    }
  } catch (error) {
    console.error("Error resending ticket:", error);
    next(new AppError("Failed to resend ticket", 500));
  }
};

// QR Code Verification for Employees
export const verifyTicketQR = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { qrCodeData } = req.body;
  const { eventId } = req.params;

  if (!qrCodeData) {
    return next(new AppError("QR code data is required", 400));
  }

  // Only employees, vendors, and admins can verify tickets
  if (!req.user || !["employee", "vendor", "admin"].includes(req.user.role)) {
    return next(new AppError("Unauthorized to verify tickets", 403));
  }

  try {
    // Validate QR code data structure and integrity
    const qrValidation = validateQRData(qrCodeData);
    if (!qrValidation.isValid) {
      return res.status(400).json({
        success: false,
        status: "invalid",
        message: qrValidation.error || "Invalid QR code",
      });
    }

    const parsedQRData = qrValidation.data;
    const {
      ticketNumber,
      eventId: qrEventId,
      userId,
      vendorId,
      seatsAllocated,
    } = parsedQRData;

    // Find the ticket with vendor and event information
    const ticket = await Ticket.findOne({ ticketNumber })
      .populate("userId", "firstName lastName email")
      .populate("eventId", "title dateSchedule location vendorId")
      .populate("vendorId", "firstName lastName email businessName");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        status: "invalid",
        message: "Ticket not found",
        details: {
          ticketNumber,
          searchedAt: new Date().toISOString(),
        },
      });
    }

    // Vendor-specific validation: Only allow employees to scan tickets for their vendor
    if (req.user.role === "employee") {
      // Get employee record to find vendorId
      const employee = await Employee.findOne({ userId: req.user._id });
      if (
        employee &&
        ticket.vendorId.toString() !== employee.vendorId.toString()
      ) {
        return res.status(403).json({
          success: false,
          status: "invalid_vendor",
          message: "Invalid - Ticket belongs to different vendor",
          details: {
            ticketNumber,
            ticketVendor: ticket.vendorId,
            employeeVendor: employee.vendorId,
            scannedBy: req.user.email,
            scannedAt: new Date().toISOString(),
          },
        });
      }
    }

    // Verify event ID matches
    if (eventId && ticket.eventId._id.toString() !== eventId) {
      return res.status(400).json({
        success: false,
        status: "invalid",
        message: "Ticket is not valid for this event",
      });
    }

    // Check if ticket is expired
    if (ticket.isExpired) {
      return res.status(400).json({
        success: false,
        status: "expired",
        message: "Ticket has expired",
        data: {
          ticket: {
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            eventTitle: (ticket.eventId as any).title,
            expiredAt: ticket.validUntil,
          },
        },
      });
    }

    // Check ticket status
    if (ticket.status === "used") {
      return res.status(400).json({
        success: false,
        status: "already_used",
        message: "Ticket has already been used",
        data: {
          ticket: {
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            eventTitle: (ticket.eventId as any).title,
            usedAt: ticket.checkInDetails?.checkInTime,
            usedBy: ticket.checkInDetails?.checkInBy,
          },
        },
      });
    }

    if (ticket.status !== "active") {
      return res.status(400).json({
        success: false,
        status: "invalid",
        message: `Ticket is ${ticket.status}`,
      });
    }

    // Check if ticket is valid for current time
    const now = new Date();
    if (ticket.validFrom && now < ticket.validFrom) {
      return res.status(400).json({
        success: false,
        status: "not_yet_valid",
        message: "Ticket is not yet valid",
        data: {
          ticket: {
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            eventTitle: (ticket.eventId as any).title,
            validFrom: ticket.validFrom,
          },
        },
      });
    }

    // Check if event has ended
    const event = ticket.eventId as any;
    const lastEventDate =
      event.dateSchedule[event.dateSchedule.length - 1]?.date;
    if (
      lastEventDate &&
      now > new Date(lastEventDate.getTime() + 24 * 60 * 60 * 1000)
    ) {
      // 24 hours after last event
      return res.status(400).json({
        success: false,
        status: "expired",
        message: "Event has ended",
        data: {
          ticket: {
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            eventTitle: event.title,
            eventEndDate: lastEventDate,
          },
        },
      });
    }

    // Update scan tracking
    await Ticket.findByIdAndUpdate(ticket._id, {
      $set: {
        "metadata.lastValidatedBy": req.user._id,
        "metadata.lastValidatedAt": new Date(),
      },
      $inc: {
        "checkInDetails.scanCount": 1,
      },
    });

    // Ticket is valid - return comprehensive information
    res.status(200).json({
      success: true,
      status: "verified",
      message: "Ticket is valid and ready for check-in",
      data: {
        ticket: {
          id: ticket._id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail,
          attendeePhone: ticket.attendeePhone,
          ticketType: ticket.ticketType,
          seatNumber: ticket.seatNumber,
          seatsAllocated: ticket.seatsAllocated || 1,
          price: ticket.price,
          currency: ticket.currency,
          status: ticket.status,
          validUntil: ticket.validUntil,
          scanCount: (ticket.checkInDetails?.scanCount || 0) + 1,
        },
        event: {
          id: event._id,
          title: event.title,
          date: event.dateSchedule[0]?.date,
          location: `${event.location.address}, ${event.location.city}`,
          coordinates: event.location.coordinates,
        },
        vendor: {
          id:
            typeof ticket.vendorId === "object" && ticket.vendorId
              ? (ticket.vendorId as any)._id || ticket.vendorId.toString()
              : ticket.vendorId.toString(),
          name:
            typeof ticket.vendorId === "object" && ticket.vendorId
              ? (ticket.vendorId as any).businessName ||
                `${(ticket.vendorId as any).firstName || ""} ${(ticket.vendorId as any).lastName || ""}`.trim() ||
                "Vendor"
              : "Vendor",
          email:
            typeof ticket.vendorId === "object" && ticket.vendorId
              ? (ticket.vendorId as any).email || "N/A"
              : "N/A",
        },
        validation: {
          scannedBy: req.user.email,
          scannedAt: new Date().toISOString(),
          validatedBy: req.user.role,
          qrVersion: parsedQRData.version || "1.0",
        },
      },
    });
  } catch (error) {
    console.error("Error verifying ticket QR:", error);
    next(new AppError("Failed to verify ticket", 500));
  }
};

// Check-in ticket after QR verification
export const checkInTicket = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { ticketId } = req.params;
  const { notes, location } = req.body;

  // Only employees, vendors, and admins can check-in tickets
  if (!req.user || !["employee", "vendor", "admin"].includes(req.user.role)) {
    return next(new AppError("Unauthorized to check-in tickets", 403));
  }

  try {
    const ticket = await Ticket.findById(ticketId)
      .populate("userId", "firstName lastName email")
      .populate("eventId", "title dateSchedule location");

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Verify ticket can be checked in
    if (ticket.status !== "active") {
      return next(new AppError(`Cannot check-in ${ticket.status} ticket`, 400));
    }

    if (ticket.isExpired) {
      return next(new AppError("Cannot check-in expired ticket", 400));
    }

    if (ticket.checkInDetails?.isCheckedIn) {
      return next(new AppError("Ticket has already been checked in", 400));
    }

    // Update ticket status and check-in details
    ticket.status = "used";
    if (!ticket.checkInDetails) {
      ticket.checkInDetails = { isCheckedIn: false, scanCount: 0 };
    }

    ticket.checkInDetails.isCheckedIn = true;
    ticket.checkInDetails.checkInTime = new Date();
    ticket.checkInDetails.checkInBy = req.user._id;
    ticket.checkInDetails.scanCount += 1;

    if (location) {
      ticket.checkInDetails.checkInLocation = location;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      status: "checked_in",
      message: "Ticket successfully checked in",
      data: {
        ticket: {
          id: ticket._id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          eventTitle: (ticket.eventId as any).title,
          checkInTime: ticket.checkInDetails.checkInTime,
          checkInBy: req.user.firstName + " " + req.user.lastName,
          scanCount: ticket.checkInDetails.scanCount,
        },
      },
    });
  } catch (error) {
    console.error("Error checking in ticket:", error);
    next(new AppError("Failed to check-in ticket", 500));
  }
};

// Get all tickets for a specific event (for event staff)
export const getEventTickets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { eventId } = req.params;
  const { status, page = 1, limit = 50 } = req.query;

  // Only employees, vendors, and admins can view event tickets
  if (!req.user || !["employee", "vendor", "admin"].includes(req.user.role)) {
    return next(new AppError("Unauthorized to view event tickets", 403));
  }

  try {
    const query: any = { eventId };
    if (status) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Ticket.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Event tickets retrieved successfully",
      data: tickets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error retrieving event tickets:", error);
    next(new AppError("Failed to retrieve event tickets", 500));
  }
};

// Get user's tickets for customer portal
export const getUserTickets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { status, upcoming } = req.query;

  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  try {
    const query: any = { userId: req.user._id };

    if (status) {
      query.status = status;
    }

    let tickets = await Ticket.find(query)
      .populate("eventId", "title dateSchedule location images description")
      .sort({ createdAt: -1 });

    // Filter for upcoming events if requested
    if (upcoming === "true") {
      const now = new Date();
      tickets = tickets.filter((ticket) => {
        const event = ticket.eventId as any;
        return event.dateSchedule.some(
          (schedule: any) => new Date(schedule.date) > now,
        );
      });
    }

    res.status(200).json({
      success: true,
      message: "User tickets retrieved successfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Error retrieving user tickets:", error);
    next(new AppError("Failed to retrieve user tickets", 500));
  }
};

// Get tickets by order ID for customer portal
export const getTicketsByOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { orderId } = req.params;

  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  if (!orderId) {
    return next(new AppError("Order ID is required", 400));
  }

  try {
    // Find tickets by order ID and populate event data
    const tickets = await Ticket.find({ orderId })
      .populate("eventId", "title dateSchedule location images description")
      .populate("userId", "firstName lastName email")
      .populate("vendorId", "firstName lastName email businessName")
      .sort({ createdAt: -1 });

    if (!tickets || tickets.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No tickets found for this order",
        tickets: [],
      });
    }

    // Verify that the requesting user owns at least one ticket in this order
    // or has admin/vendor privileges
    const userOwnsTickets = tickets.some(
      (ticket) => ticket.userId._id.toString() === req.user!._id?.toString(),
    );

    if (!userOwnsTickets && !["admin", "vendor"].includes(req.user.role)) {
      return next(
        new AppError("Unauthorized to view tickets for this order", 403),
      );
    }

    res.status(200).json({
      success: true,
      message: "Order tickets retrieved successfully",
      tickets: tickets,
    });
  } catch (error) {
    console.error("Error retrieving order tickets:", error);
    next(new AppError("Failed to retrieve order tickets", 500));
  }
};

// Download ticket as PDF
export const downloadTicketPDF = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { ticketId } = req.params;

  try {
    const ticket = await Ticket.findById(ticketId)
      .populate("userId", "firstName lastName email")
      .populate("eventId", "title dateSchedule location images");

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // Only ticket owner can download their ticket
    if (
      !req.user ||
      req.user._id?.toString() !== ticket.userId._id.toString()
    ) {
      return next(new AppError("Unauthorized to download this ticket", 403));
    }

    // For now, return ticket data - you can implement PDF generation later
    res.status(200).json({
      success: true,
      message: "Ticket data for PDF generation",
      data: {
        ticket: {
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail,
          qrCodeImage: ticket.qrCodeImage,
          eventTitle: (ticket.eventId as any).title,
          eventDate: (ticket.eventId as any).dateSchedule[0]?.date,
          eventLocation: `${(ticket.eventId as any).location.address}, ${(ticket.eventId as any).location.city}`,
          price: ticket.price,
          currency: ticket.currency,
          status: ticket.status,
          seatNumber: ticket.seatNumber,
        },
      },
    });
  } catch (error) {
    console.error("Error downloading ticket:", error);
    next(new AppError("Failed to download ticket", 500));
  }
};

// Generate missing tickets for confirmed bookings
export const generateMissingTickets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!orderId) {
      return next(new AppError("Order ID is required", 400));
    }

    if (!userId) {
      return next(new AppError("User authentication required", 401));
    }

    // Import required modules
    const { Order } = await import("../models");

    // Find the order and ensure user owns it (unless admin/vendor)
    const query: any = { _id: orderId };
    if (!["admin", "vendor"].includes(req.user.role)) {
      query.userId = userId;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return next(new AppError("Order not found or access denied", 404));
    }

    if (order.status !== "confirmed") {
      return next(
        new AppError("Order must be confirmed to generate tickets", 400),
      );
    }

    console.log(
      "Starting ticket generation for order using TicketGenerationService:",
      orderId,
    );

    // Use the centralized ticket generation service
    const result =
      await TicketGenerationService.generateMissingTicketsForOrder(orderId);

    if (!result.success) {
      console.error("Ticket generation failed:", result.errors);
      return next(
        new AppError(
          `Failed to generate tickets: ${result.errors.join(", ")}`,
          500,
        ),
      );
    }

    console.log("Ticket generation completed successfully:", {
      orderId,
      ticketsGenerated: result.totalGenerated,
    });

    res.status(200).json({
      success: true,
      message:
        result.totalGenerated > 0
          ? `Generated ${result.totalGenerated} tickets successfully`
          : "Tickets already exist for this order",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        ticketsGenerated: result.totalGenerated,
        tickets: result.tickets.map((ticket) => ({
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          qrCodeUrl: ticket.qrCodeImage,
          status: ticket.status,
          eventId: ticket.eventId,
          attendeeName: ticket.attendeeName,
          price: ticket.price,
          currency: ticket.currency,
          validFrom: ticket.validFrom,
          validUntil: ticket.validUntil,
        })),
      },
    });
  } catch (error) {
    console.error("Error generating missing tickets:", error);
    next(new AppError("Failed to generate missing tickets", 500));
  }
};
