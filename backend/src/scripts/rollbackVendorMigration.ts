import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Vendor from "../models/Vendor";
import Event from "../models/Event";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Rollback Script: Remove Vendor Model Data
 *
 * This script removes all data from the Vendor collection.
 * The original User model data remains intact.
 *
 * WARNING: This will delete all vendor documents!
 * Make sure you have a backup before running this.
 *
 * Usage:
 *   npm run rollback:vendors
 *   OR
 *   ts-node src/scripts/rollbackVendorMigration.ts
 */

interface RollbackStats {
  totalVendors: number;
  deleted: number;
  failed: number;
  eventsChecked: number;
  errors: Array<{ vendorId: string; error: string }>;
}

async function connectDatabase(): Promise<void> {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error);
    throw error;
  }
}

async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("✓ Disconnected from MongoDB");
}

async function checkDependencies(): Promise<{
  safe: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Check if events reference Vendor model
  try {
    const eventSchema = Event.schema;
    const vendorField = eventSchema.path("vendor");

    if (vendorField) {
      const eventsCount = await Event.countDocuments({});
      if (eventsCount > 0) {
        warnings.push(
          `⚠️  ${eventsCount} events may reference Vendor model. Update Event model first!`,
        );
      }
    }
  } catch (error) {
    warnings.push("⚠️  Could not check Event model dependencies");
  }

  return {
    safe: warnings.length === 0,
    warnings,
  };
}

async function runRollback(): Promise<void> {
  console.log("=".repeat(70));
  console.log("VENDOR MIGRATION ROLLBACK SCRIPT");
  console.log("=".repeat(70));
  console.log("");
  console.log("⚠️  WARNING: This will delete all Vendor documents!");
  console.log("⚠️  Make sure you have a backup before proceeding!");
  console.log("");

  const stats: RollbackStats = {
    totalVendors: 0,
    deleted: 0,
    failed: 0,
    eventsChecked: 0,
    errors: [],
  };

  try {
    // Connect to database
    await connectDatabase();
    console.log("");

    // Check dependencies
    console.log("🔍 Checking dependencies...");
    const { safe, warnings } = await checkDependencies();

    if (warnings.length > 0) {
      console.log("");
      warnings.forEach((warning) => console.log(warning));
      console.log("");
    }

    if (!safe) {
      console.log("❌ Rollback cannot proceed safely!");
      console.log("   Please update model references before rolling back.");
      console.log("");
      return;
    }

    // Count vendors
    stats.totalVendors = await Vendor.countDocuments({});
    console.log(`   Found ${stats.totalVendors} vendor documents`);
    console.log("");

    if (stats.totalVendors === 0) {
      console.log("✓ No vendor documents to delete");
      return;
    }

    // Ask for confirmation (in real scenario, you might want to add readline prompt)
    console.log("🗑️  Deleting vendor documents...");

    // Delete all vendors
    const deleteResult = await Vendor.deleteMany({});
    stats.deleted = deleteResult.deletedCount || 0;

    console.log("");
    console.log("=".repeat(70));
    console.log("ROLLBACK COMPLETE");
    console.log("=".repeat(70));
    console.log("");
    console.log("📈 Statistics:");
    console.log(`   Total Vendors:     ${stats.totalVendors}`);
    console.log(`   ✓ Deleted:         ${stats.deleted}`);
    console.log(`   ✗ Failed:          ${stats.failed}`);
    console.log("");

    if (stats.deleted === stats.totalVendors) {
      console.log("✅ All vendor documents deleted successfully!");
      console.log("");
      console.log("📝 Next steps:");
      console.log("   1. Vendor model data has been removed");
      console.log("   2. User model still contains original vendor data");
      console.log("   3. You can now safely revert code changes");
      console.log("   4. Or run the migration again if needed");
    } else {
      console.log("⚠️  Some vendors were not deleted");
    }
  } catch (error: any) {
    console.error("");
    console.error("❌ Rollback failed:", error);
    console.error("");
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Run rollback if executed directly
if (require.main === module) {
  runRollback()
    .then(() => {
      console.log("");
      console.log("Exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Rollback failed with error:", error);
      process.exit(1);
    });
}

export { runRollback, RollbackStats };
