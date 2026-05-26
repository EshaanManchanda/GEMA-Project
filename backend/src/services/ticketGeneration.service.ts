import { Types } from "mongoose";
import { Ticket, Event, User, Order } from "../models/index";
import { generateQRCode, generateSecureQRData } from "../utils/qrcode";
import { sendTicketByEmail } from "../utils/mailer";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../config/index";
import { promises as fs } from "fs";
import * as path from "path";
import { config } from "../config/index";

export interface TicketGenerationResult {
  success: boolean;
  tickets: any[];
  errors: string[];
  totalGenerated: number;
}

export interface GenerateTicketsOptions {
  sendEmail?: boolean;
  skipExisting?: boolean;
}

export class TicketGenerationService {
  /**
   * Build event booking attachments
   */
  private static async buildEventBookingAttachments(
    attachments?: any[] | null,
  ): Promise<
    Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>
  > {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const results: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }> = [];

    for (const attachment of attachments) {
      if (!attachment?.url) {
        continue;
      }

      try {
        const filename =
          attachment.originalName || attachment.filename || "event-attachment";
        const contentType = attachment.mimetype || undefined;

        if (
          attachment.provider === "local" ||
          attachment.url.startsWith("/api/uploads/files/")
        ) {
          const relativePath = attachment.url.replace(
            /^\/api\/uploads\/files\//,
            "",
          );
          const filePath = path.join(
            process.cwd(),
            config.upload.path,
            relativePath,
          );
          const content = await fs.readFile(filePath);

          results.push({
            filename,
            content,
            contentType,
          });
        } else {
          const response = await fetch(attachment.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch attachment from ${attachment.url}`);
          }

          results.push({
            filename,
            content: Buffer.from(await response.arrayBuffer()),
            contentType:
              contentType || response.headers.get("content-type") || undefined,
          });
        }
      } catch (error: any) {
        logger.warn("Failed to process attachment", {
          url: attachment?.url,
          error: error?.message,
        });
        // Skip this attachment and continue with others
      }
    }

    return results;
  }

  /**
   * Generate unique ticket number
   */
  private static async generateUniqueTicketNumber(): Promise<string> {
    let ticketNumber: string = "";
    let isUnique = false;
    while (!isUnique) {
      ticketNumber = uuidv4();
      const existingTicket = await Ticket.findOne({ ticketNumber });
      if (!existingTicket) {
        isUnique = true;
      }
    }
    return ticketNumber;
  }

  /**
   * Generate tickets for a confirmed order
   */
  static async generateTicketsForOrder(
    orderId: string | Types.ObjectId,
    options: GenerateTicketsOptions = {},
  ): Promise<TicketGenerationResult> {
    const { sendEmail = true, skipExisting = true } = options;

    try {
      logger.info("🎫 TICKET GENERATION SERVICE: Starting ticket generation", {
        orderId: orderId.toString(),
        options,
      });

      // Get order with populated event data
      logger.info("🔍 TICKET GENERATION: Finding order", {
        orderId: orderId.toString(),
      });
      const order = await Order.findById(orderId).populate("items.eventId");

      if (!order) {
        logger.error("❌ TICKET GENERATION: Order not found", {
          orderId: orderId.toString(),
        });
        throw new Error(`Order not found: ${orderId}`);
      }

      logger.info("✅ TICKET GENERATION: Order found", {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        itemsCount: order.items.length,
        userId: order.userId.toString(),
      });

      if (order.status !== "confirmed") {
        logger.error("❌ TICKET GENERATION: Order not confirmed", {
          orderId: order._id.toString(),
          currentStatus: order.status,
          expectedStatus: "confirmed",
        });
        throw new Error(
          `Order must be confirmed to generate tickets. Current status: ${order.status}`,
        );
      }

      // Check if tickets already exist
      if (skipExisting) {
        logger.info("🔍 TICKET GENERATION: Checking for existing tickets", {
          orderId: order._id.toString(),
        });
        const existingTickets = await Ticket.find({ orderId: order._id });

        if (existingTickets.length > 0) {
          logger.info(
            "✅ TICKET GENERATION: Found existing tickets, skipping generation",
            {
              orderId: order._id.toString(),
              existingCount: existingTickets.length,
              ticketIds: existingTickets.map((t) => t._id.toString()),
            },
          );
          return {
            success: true,
            tickets: existingTickets,
            errors: [],
            totalGenerated: 0,
          };
        }

        logger.info(
          "📋 TICKET GENERATION: No existing tickets found, proceeding with generation",
          {
            orderId: order._id.toString(),
          },
        );
      }

      // Get user information
      logger.info("🔍 TICKET GENERATION: Finding user", {
        userId: order.userId.toString(),
      });
      const user = await User.findById(order.userId);

      if (!user) {
        logger.error("❌ TICKET GENERATION: User not found", {
          userId: order.userId.toString(),
          orderId: order._id.toString(),
        });
        throw new Error(`User not found for order: ${orderId}`);
      }

      logger.info("✅ TICKET GENERATION: User found", {
        userId: user._id.toString(),
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
      });

      const tickets = [];
      const errors = [];

      // Generate tickets for each order item
      for (const orderItem of order.items) {
        try {
          logger.info("🎯 TICKET GENERATION: Processing order item", {
            orderId: order._id.toString(),
            eventId: orderItem.eventId.toString(),
            quantity: orderItem.quantity,
            scheduleDate: orderItem.scheduleDate.toISOString(),
            unitPrice: orderItem.unitPrice,
            currency: orderItem.currency,
          });

          const event = await Event.findById(orderItem.eventId);
          if (!event) {
            const error = `Event not found: ${orderItem.eventId}`;
            logger.error("❌ TICKET GENERATION: Event not found", {
              eventId: orderItem.eventId.toString(),
              orderId: order._id.toString(),
            });
            errors.push(error);
            continue;
          }

          logger.info("✅ TICKET GENERATION: Event found", {
            eventId: event._id.toString(),
            eventTitle: event.title,
            vendorId: event.vendorId?.toString() || event.teacherId?.toString() || 'N/A',
            eventLocation: `${event.location?.address || ''}, ${event.location?.city || ''}`,
          });

          // Generate tickets for each quantity
          for (let i = 0; i < orderItem.quantity; i++) {
            try {
              logger.info(
                `🎫 TICKET GENERATION: Creating ticket ${i + 1}/${orderItem.quantity}`,
                {
                  orderId: order._id.toString(),
                  eventId: event._id.toString(),
                },
              );

              const ticketNumber = await this.generateUniqueTicketNumber();
              logger.info(
                "✅ TICKET GENERATION: Generated unique ticket number",
                {
                  ticketNumber,
                  ticketIndex: i + 1,
                },
              );

              // Calculate validUntil using the latest end date from the event's
              // dateSchedule array + 24h grace period. This prevents tickets from
              // being marked as expired while the event is still active.
              const latestEndDate = (event.dateSchedule || []).reduce((latest: Date, sched: any) => {
                const end = sched.endDate ? new Date(sched.endDate) : null;
                const start = sched.startDate || sched.date ? new Date(sched.startDate || sched.date) : null;
                const candidate = end || start;
                if (candidate && !isNaN(candidate.getTime()) && candidate > latest) {
                  return candidate;
                }
                return latest;
              }, orderItem.scheduleDate);

              const ticketValidUntil = new Date(
                latestEndDate.getTime() + 24 * 60 * 60 * 1000,
              );

              const qrDataPayload = {
                ticketNumber,
                eventId: orderItem.eventId.toString(),
                userId: order.userId.toString(),
                vendorId: event.vendorId?.toString() || event.teacherId?.toString() || '',
                orderNumber: order.orderNumber,
                validUntil: ticketValidUntil,
                seatsAllocated: orderItem.quantity,
              };

              const qrCodeData = generateSecureQRData(qrDataPayload);

              logger.info("🖼️ TICKET GENERATION: Generating QR code image", {
                ticketNumber,
                errorCorrectionLevel: "medium",
                qrDataLength: qrCodeData.length,
              });

              const qrCodeImage = await generateQRCode(qrCodeData, {
                errorCorrectionLevel: "medium", // Medium is sufficient for URL format
                width: 300, // Slightly larger for better scanning
              });

              const ticketData = {
                ticketNumber,
                orderId: order._id,
                userId: order.userId,
                eventId: orderItem.eventId,
                vendorId: event.vendorId,
                qrCode: qrCodeData,
                qrCodeImage,
                ticketType: "general",
                seatsAllocated: orderItem.quantity,
                attendeeName: `${user.firstName} ${user.lastName}`,
                attendeeEmail: user.email,
                attendeePhone: user.phone,
                price: orderItem.unitPrice,
                currency: orderItem.currency || "AED",
                status: "active",
                checkInDetails: {
                  isCheckedIn: false,
                  scanCount: 0,
                },
                validFrom: orderItem.scheduleDate,
                validUntil: ticketValidUntil,
                metadata: {
                  generatedBy: order.userId,
                  generatedAt: new Date(),
                },
              };

              // logger.info('💾 TICKET GENERATION: Saving ticket to database', {
              //   ticketNumber,
              //   ticketData: {
              //     ...ticketData,
              //     qrCode: `${qrCodeData.substring(0, 50)}...`,
              //     qrCodeImage: `${qrCodeImage.substring(0, 50)}...`
              //   }
              // });

              const ticket = await Ticket.create(ticketData);

              logger.info(
                "✅ TICKET GENERATION: Ticket saved to database successfully",
                {
                  ticketNumber: ticket.ticketNumber,
                  ticketId: ticket._id.toString(),
                  eventId: orderItem.eventId.toString(),
                  orderId: order._id.toString(),
                  status: ticket.status,
                  attendeeName: ticket.attendeeName,
                  price: ticket.price,
                  currency: ticket.currency,
                },
              );

              // Send email with ticket details and QR code if requested (non-blocking)
              if (sendEmail) {
                (async () => {
                  try {
                    // Build venue string safely — location may be missing for online events
                    const venueParts = [
                      event.location?.address,
                      event.location?.city,
                    ].filter(Boolean);
                    const venueStr =
                      venueParts.length > 0
                        ? venueParts.join(", ")
                        : event.venueType === "Online"
                        ? "Online Event"
                        : "To be confirmed";

                    // Build event booking attachments (admin-added files)
                    let eventAttachments: Awaited<
                      ReturnType<typeof TicketGenerationService.buildEventBookingAttachments>
                    > = [];
                    try {
                      eventAttachments =
                        await TicketGenerationService.buildEventBookingAttachments(
                          (event as any).bookingAttachments,
                        );
                    } catch (attachmentError: any) {
                      logger.warn(
                        "Failed to load event booking attachments for ticket email",
                        {
                          ticketNumber,
                          eventId: event._id.toString(),
                          error: attachmentError?.message,
                        },
                      );
                      // Continue - missing attachments should not block ticket email
                    }

                    await sendTicketByEmail({
                      to: user.email,
                      firstName: user.firstName,
                      eventTitle: event.title,
                      ticketNumber,
                      qrCode: qrCodeImage,
                      eventDate: orderItem.scheduleDate,
                      venue: venueStr,
                      venueType: event.venueType,
                      eventType: (event as any).eventType,
                      meetingLink: event.meetingLink,
                      meetingPassword: (event as any).meetingPassword,
                      eventAttachments:
                        eventAttachments.length > 0 ? eventAttachments : undefined,
                    });

                    logger.info("Ticket email sent successfully", {
                      ticketNumber,
                      email: user.email,
                      orderId,
                      eventId: event._id,
                      attachmentCount: eventAttachments.length,
                    });
                  } catch (emailError: any) {
                    logger.warn("Failed to send ticket email (non-blocking)", {
                      ticketNumber,
                      email: user.email,
                      orderId,
                      eventId: event._id,
                      error: emailError.message,
                    });
                  }
                })();
              }
            } catch (ticketError) {
              const error = `Failed to create ticket ${i + 1} for event ${orderItem.eventId}: ${ticketError.message}`;
              logger.error(error, { ticketError });
              errors.push(error);
            }
          }
        } catch (itemError) {
          const error = `Failed to process order item ${orderItem.eventId}: ${itemError.message}`;
          logger.error(error, { itemError });
          errors.push(error);
        }
      }

      logger.info("🏁 TICKET GENERATION: Process completed", {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        totalTicketsGenerated: tickets.length,
        errorsCount: errors.length,
        success: errors.length === 0 || tickets.length > 0,
        ticketIds: tickets.map((t) => t._id.toString()),
        errors: errors,
      });

      const result = {
        success: errors.length === 0 || tickets.length > 0,
        tickets,
        errors,
        totalGenerated: tickets.length,
      };

      logger.info("📤 TICKET GENERATION: Returning result", {
        orderId: order._id.toString(),
        resultSummary: {
          success: result.success,
          ticketsCount: result.tickets.length,
          errorsCount: result.errors.length,
          totalGenerated: result.totalGenerated,
        },
      });

      return result;
    } catch (error) {
      logger.error("Error in ticket generation service", {
        orderId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        tickets: [],
        errors: [error.message],
        totalGenerated: 0,
      };
    }
  }

  /**
   * Generate missing tickets for orders that don't have any
   */
  static async generateMissingTicketsForOrder(
    orderId: string | Types.ObjectId,
  ): Promise<TicketGenerationResult> {
    return this.generateTicketsForOrder(orderId, {
      sendEmail: false, // Don't send emails for missing tickets
      skipExisting: true,
    });
  }

  /**
   * Check if order has tickets
   */
  static async orderHasTickets(
    orderId: string | Types.ObjectId,
  ): Promise<boolean> {
    const ticketCount = await Ticket.countDocuments({ orderId });
    return ticketCount > 0;
  }

  /**
   * Get tickets for an order
   */
  static async getTicketsForOrder(
    orderId: string | Types.ObjectId,
  ): Promise<any[]> {
    return await Ticket.find({ orderId })
      .populate("eventId", "title dateSchedule location images description")
      .populate("userId", "firstName lastName email")
      .populate("vendorId", "firstName lastName email businessName")
      .sort({ createdAt: -1 });
  }
}

export default TicketGenerationService;
