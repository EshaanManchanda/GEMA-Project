import mongoose from "mongoose";
import dotenv from "dotenv";
import Event from "../models/Event";
import Gallery from "../models/Gallery";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";

async function migrateGalleries() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for migration");

    // Find all events that have pastEventMemories
    const events = await Event.find({ "pastEventMemories.0": { $exists: true } });
    console.log(`Found ${events.length} events with pastEventMemories to migrate.`);

    let migratedCount = 0;

    for (const event of events) {
      // Check if a gallery already exists for this event
      const existingGallery = await Gallery.findOne({ eventId: event._id });
      if (existingGallery) {
        console.log(`Gallery already exists for event ${event._id}. Skipping.`);
        continue;
      }

      // Convert pastEventMemories to GalleryImages
      const images = event.pastEventMemories.map((memory: any, index: number) => ({
        url: memory.image || memory.imageUrl,
        caption: memory.caption || memory.quote || memory.participantName || "",
        order: index,
        size: "medium",
      }));

      // Create new gallery
      const gallery = new Gallery({
        eventId: event._id,
        type: "grid",
        images: images,
      });

      await gallery.save();
      console.log(`Migrated ${images.length} memories for event ${event._id} to new Gallery.`);
      migratedCount++;
    }

    console.log(`\nMigration complete! Migrated ${migratedCount} events.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrateGalleries();
