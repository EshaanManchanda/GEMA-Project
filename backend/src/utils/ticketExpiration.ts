import cron, { ScheduledTask } from "node-cron";
import { Ticket, Event } from "../models/index";
import logger from "../config/logger";

// Function to expire tickets for past events
export const expireOldTickets = async () => {
  try {
    logger.info("Running ticket expiration job...");

    const now = new Date();

    // Find all active tickets for events that have ended
    const activeTickets = await Ticket.find({ status: "active" }).populate(
      "eventId",
      "dateSchedule title",
    );

    // Collect ticket IDs that need to be expired (optimized approach)
    const ticketIdsToExpire: any[] = [];

    for (const ticket of activeTickets) {
      const event = ticket.eventId as any;

      if (event && event.dateSchedule && event.dateSchedule.length > 0) {
        // Get the last scheduled date for the event
        const lastEventDate = new Date(
          event.dateSchedule[event.dateSchedule.length - 1].date,
        );

        // Add 24 hours buffer after the last event date
        const expirationDate = new Date(
          lastEventDate.getTime() + 24 * 60 * 60 * 1000,
        );

        if (now > expirationDate) {
          ticketIdsToExpire.push(ticket._id);
          logger.info(
            `Marking ticket ${ticket.ticketNumber} for expiration (event: ${event.title})`,
          );
        }
      }
    }

    // Bulk update all expired tickets in a single operation (much faster!)
    let expiredCount = 0;
    if (ticketIdsToExpire.length > 0) {
      const result = await Ticket.updateMany(
        { _id: { $in: ticketIdsToExpire } },
        { $set: { status: "expired" } },
      );
      expiredCount = result.modifiedCount || 0;
    }

    logger.info(
      `Ticket expiration job completed. Expired ${expiredCount} tickets.`,
    );
  } catch (error) {
    logger.error("Error in ticket expiration job:", error);
  }
};

// Function to delete QR codes for expired tickets (for security)
export const cleanupExpiredQRCodes = async () => {
  try {
    logger.info("Running QR code cleanup job...");

    // Use bulk update instead of individual saves (much faster!)
    const result = await Ticket.updateMany(
      {
        status: "expired",
        $or: [
          { qrCode: { $exists: true, $nin: [null, ""] } },
          { qrCodeImage: { $exists: true, $nin: [null, ""] } },
        ],
      },
      {
        $set: {
          qrCode: "",
          qrCodeImage: "",
        },
      },
    );

    const cleanedCount = result.modifiedCount || 0;

    logger.info(
      `QR code cleanup job completed. Cleaned ${cleanedCount} QR codes.`,
    );
  } catch (error) {
    logger.error("Error in QR code cleanup job:", error);
  }
};

// Store cron task references for cleanup
let ticketExpirationTask: ScheduledTask | null = null;
let qrCleanupTask: ScheduledTask | null = null;

// Schedule jobs to run periodically
export const scheduleTicketJobs = () => {
  // Run ticket expiration job every hour
  ticketExpirationTask = cron.schedule("0 * * * *", expireOldTickets);

  // Run QR code cleanup job daily at 2 AM
  qrCleanupTask = cron.schedule("0 2 * * *", cleanupExpiredQRCodes);

  logger.info("Ticket management jobs scheduled successfully");
};

// Cleanup function to stop all cron jobs (call on shutdown)
export const stopTicketJobs = () => {
  if (ticketExpirationTask) {
    ticketExpirationTask.stop();
    logger.info("Ticket expiration job stopped");
  }

  if (qrCleanupTask) {
    qrCleanupTask.stop();
    logger.info("QR cleanup job stopped");
  }
};

// Manual functions that can be called via API
export const manualExpireTickets = expireOldTickets;
export const manualCleanupQRCodes = cleanupExpiredQRCodes;
