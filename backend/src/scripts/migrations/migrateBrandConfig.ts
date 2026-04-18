import mongoose from "mongoose";
import { EmailSettings } from "../models/index";
import { AdminRevenueSettings } from "../models/index";
import { getBrandConfig } from "../utils/brandConfig";

/**
 * Migration script to update brand references from Gema to Kidrove
 *
 * This script updates:
 * - EmailSettings: senderName, senderEmail, smtpUser, and email templates
 * - AdminRevenueSettings: platformName
 *
 * Usage: npm run migrate:brand
 */
async function migrateBrandConfig() {
  try {
    console.log("🚀 Starting brand configuration migration...\n");

    // Connect to database
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const brand = getBrandConfig();
    console.log(`📦 Brand Config:
  - App Name: ${brand.appName}
  - Full Name: ${brand.appNameFull}
  - Contact Email: ${brand.contactEmail}\n`);

    // Migrate EmailSettings
    console.log("📧 Migrating EmailSettings...");
    const emailSettingsCount = await EmailSettings.countDocuments({
      $or: [
        { senderName: { $regex: /gema/i } },
        { senderEmail: { $regex: /gema/i } },
        { smtpUser: { $regex: /gema/i } },
      ],
    });

    if (emailSettingsCount > 0) {
      const emailResult = await EmailSettings.updateMany(
        {
          $or: [
            { senderName: { $regex: /gema/i } },
            { senderEmail: { $regex: /gema/i } },
            { smtpUser: { $regex: /gema/i } },
          ],
        },
        {
          $set: {
            senderName: brand.appNameFull,
            senderEmail: brand.contactEmail,
            smtpUser: brand.contactEmail,
          },
        },
      );
      console.log(
        `  ✓ Updated ${emailResult.modifiedCount} EmailSettings documents`,
      );
    } else {
      console.log(
        '  ℹ No EmailSettings documents found with "gema" references',
      );
    }

    // Migrate email templates in EmailSettings
    console.log("\n📝 Migrating email templates...");
    const templateFields = [
      "welcomeEmailTemplate",
      "orderConfirmationTemplate",
      "ticketEmailTemplate",
      "vendorBookingNotificationTemplate",
      "employeeWelcomeEmailTemplate",
      "contactNotificationTemplate",
      "partnershipNotificationTemplate",
      "partnershipConfirmationTemplate",
    ];

    for (const field of templateFields) {
      const query: any = {};
      query[field] = { $regex: /gema/i };

      const count = await EmailSettings.countDocuments(query);
      if (count > 0) {
        // Get all documents with this template field
        const docs = await EmailSettings.find(query);

        for (const doc of docs) {
          const template = (doc as any)[field];
          if (template && typeof template === "string") {
            // Replace case-insensitive Gema with Kidrove
            const updatedTemplate = template
              .replace(/Gema Events/gi, brand.appNameFull)
              .replace(/Gema/gi, brand.appName)
              .replace(/gemaevents\.com/gi, "kidrove.com")
              .replace(/@gemaevents\.com/gi, `@kidrove.com`);

            (doc as any)[field] = updatedTemplate;
          }
        }

        // Save all updated documents
        await Promise.all(docs.map((doc) => doc.save()));
        console.log(`  ✓ Updated ${field} in ${count} documents`);
      }
    }

    // Migrate AdminRevenueSettings
    console.log("\n💰 Migrating AdminRevenueSettings...");
    const revenueSettingsCount = await AdminRevenueSettings.countDocuments({
      platformName: { $regex: /gema/i },
    });

    if (revenueSettingsCount > 0) {
      const revenueResult = await AdminRevenueSettings.updateMany(
        { platformName: { $regex: /gema/i } },
        { $set: { platformName: `${brand.appName} Platform` } },
      );
      console.log(
        `  ✓ Updated ${revenueResult.modifiedCount} AdminRevenueSettings documents`,
      );
    } else {
      console.log(
        '  ℹ No AdminRevenueSettings documents found with "gema" references',
      );
    }

    console.log("\n✨ Brand configuration migration completed successfully!\n");

    // Summary
    console.log(`📊 Migration Summary:
  - EmailSettings sender info updated
  - Email templates updated
  - AdminRevenueSettings platform name updated
  - All references changed from "Gema" to "Kidrove"\n`);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateBrandConfig().catch(console.error);
}

export default migrateBrandConfig;
