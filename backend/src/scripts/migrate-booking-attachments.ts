/**
 * Migration script to ensure all events have bookingAttachments field initialized
 * Run: npm run db:migrate -- migrate-booking-attachments.ts
 * Or: npx ts-node src/scripts/migrate-booking-attachments.ts
 */

import mongoose from "mongoose";
import { config, connectDB, closeDBConnection } from "../config/index";
import Event from "../models/Event";
import logger from "../config/logger";

async function migrateBookingAttachments() {
  try {
    logger.info("Starting booking attachments migration...");
    
    // Connect to database
    await connectDB();
    logger.info("Connected to MongoDB");

    // Find all events that don't have bookingAttachments field or it's undefined
    const eventsWithoutAttachments = await Event.find({
      $or: [
        { bookingAttachments: { $exists: false } },
        { bookingAttachments: null },
      ],
    }).lean();

    logger.info(
      `Found ${eventsWithoutAttachments.length} events without bookingAttachments field`,
    );

    if (eventsWithoutAttachments.length === 0) {
      logger.info("All events already have bookingAttachments field initialized");
      await closeDBConnection();
      return;
    }

    // Update all events to have bookingAttachments as empty array
    const result = await Event.updateMany(
      {
        $or: [
          { bookingAttachments: { $exists: false } },
          { bookingAttachments: null },
        ],
      },
      {
        $set: { bookingAttachments: [] },
      },
    );

    logger.info(`Migration completed successfully`);
    logger.info(`Updated: ${result.modifiedCount} documents`);
    logger.info(`Matched: ${result.matchedCount} documents`);
    logger.info(`UpsertedIds: ${result.upsertedIds?.length || 0}`);

    // Verify the migration
    const verifyCount = await Event.countDocuments({
      bookingAttachments: { $exists: false },
    });

    if (verifyCount === 0) {
      logger.info("✓ Migration verified: all events have bookingAttachments field");
    } else {
      logger.warn(
        `⚠️ Verification failed: ${verifyCount} events still missing bookingAttachments`,
      );
    }

    await closeDBConnection();
    logger.info("Migration completed and database connection closed");
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateBookingAttachments();
