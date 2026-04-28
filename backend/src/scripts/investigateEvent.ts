import mongoose from "mongoose";
import { Event } from "../models/index";
import { config } from "../config/env";
import { buildPublicEventFilter } from "../utils/event.utils";

const EVENT_ID = "6901a340bc4f36db9e7ad85f";

async function investigateEvent() {
  try {
    console.log("=".repeat(80));
    console.log("EVENT INVESTIGATION SCRIPT");
    console.log("=".repeat(80));
    console.log(`\nInvestigating Event ID: ${EVENT_ID}`);
    console.log(`Current Time: ${new Date().toISOString()}\n`);

    // Connect to database
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);
    console.log("✓ Connected to MongoDB\n");

    // Query event directly (bypassing filters)
    console.log("1. QUERYING EVENT DIRECTLY (no filters)");
    console.log("-".repeat(80));
    const event = await Event.findById(EVENT_ID);

    if (!event) {
      console.log("❌ EVENT DOES NOT EXIST IN DATABASE");
      console.log("   Possible reasons:");
      console.log("   - Event ID is incorrect (typo)");
      console.log("   - Event was permanently deleted from database");
      console.log("   - Database is not the expected one");
      await mongoose.disconnect();
      return;
    }

    console.log("✓ Event found in database\n");

    // Display critical fields
    console.log("2. CRITICAL FIELDS ANALYSIS");
    console.log("-".repeat(80));
    console.log(`Title:         ${event.title}`);
    console.log(`Vendor ID:     ${event.vendorId}`);
    console.log(
      `isApproved:    ${event.isApproved}    ${event.isApproved ? "✓" : "❌ FAILING"}`,
    );
    console.log(
      `isActive:      ${event.isActive}      ${event.isActive ? "✓" : "❌ FAILING"}`,
    );
    console.log(
      `status:        ${event.status}        ${event.status === "published" ? "✓" : "❌ FAILING (expected: published)"}`,
    );
    console.log(
      `isDeleted:     ${event.isDeleted}     ${!event.isDeleted ? "✓" : "❌ FAILING"}`,
    );
    console.log();

    // Date schedule analysis
    console.log("3. DATE SCHEDULE ANALYSIS");
    console.log("-".repeat(80));
    if (!event.dateSchedule || event.dateSchedule.length === 0) {
      console.log("❌ NO DATE SCHEDULE FOUND");
    } else {
      console.log(`Total schedules: ${event.dateSchedule.length}\n`);

      const now = new Date();
      const bufferTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      event.dateSchedule.forEach((schedule: any, index: number) => {
        const scheduleDate = schedule.date ? new Date(schedule.date) : null;
        const startDate = schedule.startDate
          ? new Date(schedule.startDate)
          : null;
        const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

        console.log(`Schedule #${index + 1}:`);
        if (scheduleDate) {
          console.log(`  date (legacy):  ${scheduleDate.toISOString()}`);
          console.log(
            `  Status:         ${scheduleDate >= bufferTime ? "✓ VALID (within buffer)" : "❌ EXPIRED (beyond buffer)"}`,
          );
        }
        if (startDate) {
          console.log(`  startDate:      ${startDate.toISOString()}`);
        }
        if (endDate) {
          console.log(`  endDate:        ${endDate.toISOString()}`);
          console.log(
            `  Status:         ${endDate >= bufferTime ? "✓ VALID (within buffer)" : "❌ EXPIRED (beyond buffer)"}`,
          );
        }
        console.log(`  availableSeats: ${schedule.availableSeats}`);
        console.log();
      });

      // Get latest end date
      const latestEndDateInSchedule = event.getEndDate();
      if (latestEndDateInSchedule) {
        const expirationDate = new Date(
          latestEndDateInSchedule.getTime() + 24 * 60 * 60 * 1000,
        );
        const isExpired = now > expirationDate;
        const timeDiff = expirationDate.getTime() - now.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        console.log("EXPIRATION SUMMARY:");
        console.log(
          `  Latest end date:        ${latestEndDateInSchedule.toISOString()}`,
        );
        console.log(
          `  24h buffer expiration:  ${expirationDate.toISOString()}`,
        );
        console.log(`  Current time:           ${now.toISOString()}`);
        console.log(
          `  Is expired?             ${isExpired ? "❌ YES (beyond buffer)" : "✓ NO (within buffer)"}`,
        );
        console.log(
          `  Days ${isExpired ? "since" : "until"} expiration: ${Math.abs(daysDiff).toFixed(2)} days`,
        );
        console.log();
      }
    }

    // Test against public filter
    console.log("4. PUBLIC FILTER TEST");
    console.log("-".repeat(80));
    const publicFilter = buildPublicEventFilter({
      _id: new mongoose.Types.ObjectId(EVENT_ID),
    });
    console.log("Public filter criteria:");
    console.log(JSON.stringify(publicFilter, null, 2));
    console.log();

    const publicEvent = await Event.findOne(publicFilter);
    if (publicEvent) {
      console.log("✓ EVENT PASSES PUBLIC FILTER");
      console.log("  The event should be visible in public queries");
    } else {
      console.log("❌ EVENT FAILS PUBLIC FILTER");
      console.log(
        '  This is why the event returns "Event not found or expired"',
      );
    }
    console.log();

    // Diagnosis
    console.log("5. DIAGNOSIS");
    console.log("-".repeat(80));
    const failures: string[] = [];

    if (!event.isApproved) {
      failures.push("Event is NOT APPROVED (isApproved: false)");
    }
    if (!event.isActive) {
      failures.push("Event is INACTIVE (isActive: false)");
    }
    if (event.status !== "published") {
      failures.push(
        `Event status is "${event.status}" (expected: "published")`,
      );
    }
    if (event.isDeleted) {
      failures.push("Event is SOFT-DELETED (isDeleted: true)");
    }

    const latestEndDate = event.getEndDate();
    if (latestEndDate) {
      const now = new Date();
      const bufferTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const expirationDate = new Date(
        latestEndDate.getTime() + 24 * 60 * 60 * 1000,
      );

      const hasValidDate = event.dateSchedule.some((schedule: any) => {
        const dateToCheck = schedule.endDate || schedule.date;
        return dateToCheck && new Date(dateToCheck) >= bufferTime;
      });

      if (!hasValidDate) {
        failures.push("ALL dates are EXPIRED (beyond 24-hour buffer)");
      }
    }

    if (failures.length === 0) {
      console.log("✓ NO ISSUES FOUND - Event should be visible");
      console.log(
        "  The problem might be with the server not having the latest code",
      );
      console.log("  Try restarting the backend server");
    } else {
      console.log("❌ ISSUES FOUND:");
      failures.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure}`);
      });
    }
    console.log();

    // Recommendations
    console.log("6. RECOMMENDED FIXES");
    console.log("-".repeat(80));
    if (!event.isApproved) {
      console.log(
        '→ To approve: db.events.updateOne({ _id: ObjectId("' +
          EVENT_ID +
          '") }, { $set: { isApproved: true } })',
      );
    }
    if (!event.isActive) {
      console.log(
        '→ To activate: db.events.updateOne({ _id: ObjectId("' +
          EVENT_ID +
          '") }, { $set: { isActive: true } })',
      );
    }
    if (event.status !== "published") {
      console.log(
        '→ To publish: db.events.updateOne({ _id: ObjectId("' +
          EVENT_ID +
          '") }, { $set: { status: "published" } })',
      );
    }
    if (event.isDeleted) {
      console.log(
        '→ To restore: db.events.updateOne({ _id: ObjectId("' +
          EVENT_ID +
          '") }, { $set: { isDeleted: false } })',
      );
    }

    const latestEndDateForFix = event.getEndDate();
    if (latestEndDateForFix) {
      const nowForFix = new Date();
      const bufferTimeForFix = new Date(
        nowForFix.getTime() - 24 * 60 * 60 * 1000,
      );
      const hasValidDate = event.dateSchedule.some((schedule: any) => {
        const dateToCheck = schedule.endDate || schedule.date;
        return dateToCheck && new Date(dateToCheck) >= bufferTimeForFix;
      });

      if (!hasValidDate) {
        const newDate = new Date(nowForFix.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        console.log(
          "→ To extend dates: Update dateSchedule.endDate to a future date (e.g., " +
            newDate.toISOString() +
            ")",
        );
      }
    }

    if (failures.length === 0) {
      console.log(
        "→ Restart the backend server to load the new expiration logic code",
      );
      console.log("→ Clear Redis cache: redis-cli FLUSHDB");
    }

    console.log("\n" + "=".repeat(80));
    console.log("INVESTIGATION COMPLETE");
    console.log("=".repeat(80));

    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("Error during investigation:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the investigation
investigateEvent();
