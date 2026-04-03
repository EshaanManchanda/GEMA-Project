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
                if (!event.title) {
                    console.warn(`Skipping event ${event._id} (no title)`);
                    continue;
                }

                // Generate base slug
                let baseSlug = generateSlug(event.title);
                if (!baseSlug) baseSlug = 'event'; // Fallback

                let slug = baseSlug;
                let counter = 1;

                // Check uniqueness loop
                while (true) {
                    const existing = await mongoose.model('Event').findOne({
                        slug: slug,
                        _id: { $ne: event._id }
                    });
                    if (!existing) break;
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Explicitly set the slug to bypass "Path slug is required" validation error
                event.slug = slug;

                // Also ensure affiliate code is set if missing
                if (!event.affiliateCode) {
                    event.affiliateCode = `EVT-${(event._id as any).toString().slice(-8).toUpperCase()}`;
                }

                await event.save();
                console.log(`✅ Updated slug for: "${event.title}" -> "${event.slug}"`);
                updatedCount++;
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
