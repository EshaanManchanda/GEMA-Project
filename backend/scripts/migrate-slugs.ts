import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Event } from '../src/models';

// Load environment variables
// Try to load from CWD first (standard behavior)
dotenv.config();
// Also try explicitly from backend root if running from elsewhere or if CWD is different
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kidrove';
console.log('Target Database:', MONGODB_URI.replace(/:\/\/[^@]+@/, '://***:***@')); // Log masked URI for verification

// Helper function to generate slug (copied from Event model for standalone script)
const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 200);
};

const migrateSlugs = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully.');

        const events = await Event.find({
            $or: [
                { slug: { $exists: false } },
                { slug: null },
                { slug: '' }
            ]
        });

        console.log(`Found ${events.length} events missing slugs.`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const event of events) {
            try {
                // Option 1: Trigger save to use pre-save hook (safest)
                // This will run the logic in Event model which handles uniqueness

                // If we want to be explicit or if pre-save hook fails for some reason:
                if (!event.slug) {
                    // Logic is already in pre-save hook of Event model
                    // Just saving should trigger it
                    await event.save();
                    console.log(`✅ Updated slug for: "${event.title}" -> "${event.slug}"`);
                    updatedCount++;
                }
            } catch (err: any) {
                console.error(`❌ Failed to update event: "${event.title}" (${event._id}) - ${err.message}`);
                errorCount++;
            }
        }

        console.log('\nMigration complete!');
        console.log(`Successfully updated: ${updatedCount}`);
        console.log(`Failed: ${errorCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateSlugs();
