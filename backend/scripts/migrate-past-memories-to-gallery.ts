import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Event, Gallery } from '../src/models';

// Load environment variables
dotenv.config();
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kidrove';
console.log('Target Database:', MONGODB_URI.replace(/:\/\/[^@]+@/, '://***:***@'));

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // Find events that have at least one pastEventMemory
    const events = await Event.find({ 'pastEventMemories.0': { $exists: true } });
    console.log(`Found ${events.length} events with pastEventMemories.`);

    let created = 0;
    let skipped = 0;
    for (const evt of events) {
      try {
        // If gallery already exists, skip
        if ((evt as any).galleryId) {
          skipped++;
          console.log(`Skipping ${evt._id} (already has gallery)`);
          continue;
        }

        const memories = (evt as any).pastEventMemories || [];
        if (!Array.isArray(memories) || memories.length === 0) {
          skipped++;
          continue;
        }

        const images = memories.map((m: any, idx: number) => ({
          url: m.image,
          caption: m.caption || m.participantName || undefined,
          order: idx,
          size: 'medium',
        }));

        const gallery = await Gallery.create({
          eventId: evt._id,
          type: 'grid',
          images,
        });

        // Link gallery on event (leave legacy pastEventMemories intact for backward compatibility)
        (evt as any).galleryId = gallery._id;
        await evt.save();

        created++;
        console.log(`Created gallery ${gallery._id} for event ${evt._id}`);
      } catch (err: any) {
        console.error(`Failed to migrate event ${evt._id}:`, err.message || err);
      }
    }

    console.log('\nMigration complete');
    console.log(`Galleries created: ${created}`);
    console.log(`Events skipped: ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
