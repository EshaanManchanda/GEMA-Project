import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";

const migrateVenues = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const db = mongoose.connection.db;

    // Check if venues collection exists
    const collections = await db.listCollections({ name: "venues" }).toArray();
    if (collections.length === 0) {
      console.log('No "venues" collection found. Nothing to migrate.');
      return;
    }

    const venuesCollection = db.collection("venues");
    const eventsCollection = db.collection("events");

    const venues = await venuesCollection.find({}).toArray();
    console.log(`Found ${venues.length} venues to migrate.`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const venue of venues) {
      try {
        // Map venue to event
        const eventData: any = {
          ...venue,
          type: "Venue", // Explicitly set type
          // Map name to title
          title: venue.name,

          // Map address to location
          location: venue.address
            ? {
                address: venue.address.street,
                city: venue.address.city,
                state: venue.address.state,
                country: venue.address.country || "AE",
                zipCode: venue.address.zipCode,
                coordinates: venue.coordinates || venue.address.coordinates,
              }
            : undefined,

          // Map other fields
          price: venue.baseRentalPrice,
          category: "Venue", // Default category

          // Map Status
          status: "published", // Default
          isActive: true, // Default
        };

        if (venue.status === "inactive") {
          eventData.isActive = false;
        } else if (venue.status === "maintenance") {
          eventData.isActive = false;
          eventData.cancellationStatus = "cancelled";
        } else if (venue.status === "suspended") {
          eventData.isActive = false;
          eventData.status = "rejected";
        }

        // Remove old fields that don't match
        delete eventData.name;
        delete eventData.address;
        delete eventData.baseRentalPrice;
        delete eventData.venueType; // Should verify if this matches Event's venueType or needs mapping?
        // Event has 'Indoor' | 'Outdoor'. Venue had 'INDOOR', 'OUTDOOR', 'HYBRID'.
        if (venue.venueType === "INDOOR") eventData.venueType = "Indoor";
        if (venue.venueType === "OUTDOOR") eventData.venueType = "Outdoor";
        if (venue.venueType === "HYBRID") {
          eventData.venueType = "Indoor"; // Fallback or handle appropriately
          // Maybe add a tag?
          if (!eventData.tags) eventData.tags = [];
          eventData.tags.push("Hybrid");
        }

        // Check if event with this ID already exists (to avoid duplicates if run multiple times)
        const existing = await eventsCollection.findOne({ _id: venue._id });
        if (existing) {
          console.log(`Event with ID ${venue._id} already exists. Skipping.`);
          continue;
        }

        await eventsCollection.insertOne(eventData);
        migratedCount++;
      } catch (err: any) {
        console.error(`Error migrating venue ${venue._id}:`, err.message);
        errorCount++;
      }
    }

    console.log(`Migration complete.`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

migrateVenues();
