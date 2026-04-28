/**
 * Migration Script: Venue & Ticket vendorId from User._id → Vendor._id
 *
 * Usage:
 *   DRY_RUN=true  npx ts-node src/scripts/migrate-venue-vendor-ids.ts
 *   DRY_RUN=false npx ts-node src/scripts/migrate-venue-vendor-ids.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.env.DRY_RUN !== "false";

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI env var not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB. DRY_RUN=${DRY_RUN}`);

  const db = mongoose.connection.db;
  if (!db) {
    console.error("DB connection not available");
    process.exit(1);
  }

  const vendorsCol = db.collection("vendors");
  const venuesCol = db.collection("venues");
  const ticketsCol = db.collection("tickets");

  // Build userId -> vendor._id lookup
  const vendors = await vendorsCol
    .find(
      {},
      {
        projection: { userId: 1 },
      },
    )
    .toArray();

  const userToVendor = new Map<string, mongoose.Types.ObjectId>();
  for (const v of vendors) {
    if (v.userId) {
      userToVendor.set(v.userId.toString(), v._id);
    }
  }

  console.log(`Found ${vendors.length} vendor profiles`);

  // --- Migrate Venues ---
  const venues = await venuesCol.find({}).toArray();
  let venueUpdated = 0;
  let venueSkipped = 0;
  let venueAlreadyCorrect = 0;

  for (const venue of venues) {
    const currentVendorId = venue.vendorId?.toString();
    if (!currentVendorId) {
      venueSkipped++;
      continue;
    }

    // Check if already pointing to a Vendor doc
    if (userToVendor.has(currentVendorId)) {
      // currentVendorId is a User._id, need to migrate
      // (This case means the lookup found a vendor with this userId)
    }

    // Check if it's already a Vendor._id
    const isAlreadyVendorId = vendors.some(
      (v) => v._id.toString() === currentVendorId,
    );
    if (isAlreadyVendorId) {
      venueAlreadyCorrect++;
      continue;
    }

    // Look up Vendor by userId
    const vendorId = userToVendor.get(currentVendorId);
    if (!vendorId) {
      console.warn(
        `  [SKIP] Venue ${venue._id} (${venue.name}): ` +
          `no Vendor profile for userId=${currentVendorId}`,
      );
      venueSkipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  [DRY] Venue ${venue._id} (${venue.name}): ` +
          `${currentVendorId} -> ${vendorId}`,
      );
    } else {
      await venuesCol.updateOne({ _id: venue._id }, { $set: { vendorId } });
      console.log(
        `  [OK] Venue ${venue._id} (${venue.name}): ` +
          `${currentVendorId} -> ${vendorId}`,
      );
    }
    venueUpdated++;
  }

  console.log(
    `\nVenues: ${venueUpdated} updated, ` +
      `${venueAlreadyCorrect} already correct, ` +
      `${venueSkipped} skipped`,
  );

  // --- Migrate Tickets ---
  const tickets = await ticketsCol.find({}).toArray();
  let ticketUpdated = 0;
  let ticketSkipped = 0;
  let ticketAlreadyCorrect = 0;

  for (const ticket of tickets) {
    const currentVendorId = ticket.vendorId?.toString();
    if (!currentVendorId) {
      ticketSkipped++;
      continue;
    }

    const isAlreadyVendorId = vendors.some(
      (v) => v._id.toString() === currentVendorId,
    );
    if (isAlreadyVendorId) {
      ticketAlreadyCorrect++;
      continue;
    }

    const vendorId = userToVendor.get(currentVendorId);
    if (!vendorId) {
      ticketSkipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  [DRY] Ticket ${ticket._id}: ` + `${currentVendorId} -> ${vendorId}`,
      );
    } else {
      await ticketsCol.updateOne({ _id: ticket._id }, { $set: { vendorId } });
    }
    ticketUpdated++;
  }

  console.log(
    `Tickets: ${ticketUpdated} updated, ` +
      `${ticketAlreadyCorrect} already correct, ` +
      `${ticketSkipped} skipped`,
  );

  console.log(`\nMigration ${DRY_RUN ? "(DRY RUN)" : ""} complete.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
