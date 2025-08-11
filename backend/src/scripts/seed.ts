import mongoose from 'mongoose';
import { config, connectDB, logger } from '../config';
import { Role, DEFAULT_ROLES } from '../models';

/**
 * Seed default roles
 */
async function seedRoles() {
  try {
    logger.info('Seeding default roles...');
    
    // Create default roles if they don't exist
    for (const [key, roleData] of Object.entries(DEFAULT_ROLES)) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (!existingRole) {
        await Role.create(roleData);
        logger.info(`Created role: ${roleData.name}`);
      } else {
        logger.info(`Role already exists: ${roleData.name}`);
      }
    }
    
    logger.info('Roles seeding completed');
  } catch (error) {
    logger.error('Error seeding roles:', error);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seed() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Seed data
    await seedRoles();
    
    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();