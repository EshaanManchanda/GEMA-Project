/**
 * Migration Script: Convert Phone Numbers to E.164 Format
 *
 * This script scans the database for phone numbers that are not in E.164 format
 * and converts them to the proper format.
 *
 * Usage:
 *   npx ts-node src/scripts/migratePhoneNumbers.ts
 *
 * Options:
 *   --dry-run : Show what would be changed without making actual changes
 *   --country : Default country code to use (default: IN for India)
 */

import mongoose from 'mongoose';
import { config } from '../config';
import User from '../models/User';
import { sanitizeToE164, isE164Format } from '../utils/phoneValidation';

interface MigrationResult {
  total: number;
  converted: number;
  alreadyValid: number;
  failed: number;
  errors: Array<{ userId: string; phone: string; error: string }>;
}

const dryRun = process.argv.includes('--dry-run');
const defaultCountry = process.argv.includes('--country')
  ? process.argv[process.argv.indexOf('--country') + 1] as 'IN' | 'US'
  : 'IN';

console.log('='.repeat(70));
console.log('PHONE NUMBER MIGRATION TO E.164 FORMAT');
console.log('='.repeat(70));
console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (database will be updated)'}`);
console.log(`Default Country: ${defaultCountry}`);
console.log('='.repeat(70));
console.log();

async function migratePhoneNumbers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    converted: 0,
    alreadyValid: 0,
    failed: 0,
    errors: []
  };

  try {
    // Find all users with phone numbers
    const users = await User.find({
      phone: { $exists: true, $nin: [null, ''] }
    });

    result.total = users.length;
    console.log(`Found ${result.total} users with phone numbers\n`);

    for (const user of users) {
      const phone = user.phone;
      if (!phone) continue;

      console.log(`Processing user: ${user._id} (${user.email || user.firstName})`);
      console.log(`  Current phone: ${phone}`);

      // Check if already in E.164 format
      if (isE164Format(phone)) {
        console.log(`  ✓ Already in E.164 format`);
        result.alreadyValid++;
        console.log();
        continue;
      }

      // Try to convert to E.164
      const e164Phone = sanitizeToE164(phone, defaultCountry);

      if (e164Phone) {
        console.log(`  → Converting to: ${e164Phone}`);

        if (!dryRun) {
          try {
            user.phone = e164Phone;
            await user.save();
            console.log(`  ✓ Updated successfully`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.log(`  ✗ Failed to update: ${errorMsg}`);
            result.errors.push({
              userId: user._id.toString(),
              phone,
              error: errorMsg
            });
            result.failed++;
            console.log();
            continue;
          }
        } else {
          console.log(`  ✓ Would be updated (dry-run mode)`);
        }

        result.converted++;
      } else {
        const errorMsg = 'Unable to convert to E.164 format';
        console.log(`  ✗ ${errorMsg}`);
        result.errors.push({
          userId: user._id.toString(),
          phone,
          error: errorMsg
        });
        result.failed++;
      }

      console.log();
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }

  return result;
}

async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✓ Connected to MongoDB\n');

    // Run migration
    const result = await migratePhoneNumbers();

    // Print summary
    console.log('='.repeat(70));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total users processed:    ${result.total}`);
    console.log(`Already in E.164 format:  ${result.alreadyValid}`);
    console.log(`Successfully converted:   ${result.converted}`);
    console.log(`Failed to convert:        ${result.failed}`);
    console.log('='.repeat(70));

    if (result.errors.length > 0) {
      console.log('\nERRORS:');
      console.log('-'.repeat(70));
      result.errors.forEach(({ userId, phone, error }) => {
        console.log(`User ID: ${userId}`);
        console.log(`Phone: ${phone}`);
        console.log(`Error: ${error}`);
        console.log('-'.repeat(70));
      });
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✓ Migration completed successfully');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
main();
