import mongoose from 'mongoose';
import Collection from '../models/Collection';
import Event from '../models/Event';
import { cacheService } from './cache.service';
import logger from '../config/logger';

export class CollectionSyncService {
  /**
   * Get event subset for embedding
   * Optimized field selection (~1 KB per event)
   */
  private async getEventDataForEmbed(eventId: mongoose.Types.ObjectId) {
    try {
      const event = await Event.findById(eventId)
        .select(
          '_id title description category type venueType price currency ' +
          'images imageAssets location.city location.address dateSchedule ' +
          'ageRange isFeatured viewsCount averageRating isApproved isActive ' +
          'isDeleted status vendorId updatedAt'
        )
        .lean();

      if (!event) return null;

      // Limit images to first 3
      const limitedEvent = {
        ...event,
        images: event.images?.slice(0, 3) || [],
        imageAssets: event.imageAssets?.slice(0, 5) || [],
        // Limit dateSchedule to next 5 upcoming schedules
        dateSchedule: this.getUpcomingSchedules(event.dateSchedule, 5)
      };

      return limitedEvent;
    } catch (error) {
      logger.error(`Error fetching event data for embed ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Get upcoming schedules (sorted by date)
   */
  private getUpcomingSchedules(schedules: any[], limit: number) {
    if (!schedules || schedules.length === 0) return [];

    const now = new Date();
    return schedules
      .filter(s => {
        const date = s.endDate || s.startDate || s.date;
        return date && new Date(date) >= now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.startDate || a.date);
        const dateB = new Date(b.startDate || b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Sync single event across all collections
   * Called from queue worker
   */
  async syncEventToCollections(eventId: string | mongoose.Types.ObjectId) {
    try {
      const objId = typeof eventId === 'string'
        ? new mongoose.Types.ObjectId(eventId)
        : eventId;

      logger.info(`Syncing event ${objId} to collections`);

      // Get fresh event data
      const eventData = await this.getEventDataForEmbed(objId);

      if (!eventData) {
        logger.warn(`Event ${objId} not found, removing from collections`);
        return this.removeEventFromCollections(objId);
      }

      // Check if event is approved and active
      if (!eventData.isApproved || !eventData.isActive || eventData.isDeleted) {
        logger.info(`Event ${objId} not approved/active, removing from collections`);
        return this.removeEventFromCollections(objId);
      }

      // Find collections containing this event
      const collections = await Collection.find({
        'events': objId
      });

      if (collections.length === 0) {
        logger.info(`No collections contain event ${objId}`);
        return { updated: 0, removed: 0 };
      }

      let updated = 0;
      for (const collection of collections) {
        try {
          // Update or insert event data
          const eventIndex = collection.eventsData?.findIndex(
            e => e._id.toString() === objId.toString()
          ) ?? -1;

          if (!collection.eventsData) {
            collection.eventsData = [];
          }

          if (eventIndex >= 0) {
            // Update existing
            collection.eventsData[eventIndex] = eventData as any;
          } else {
            // Insert new
            collection.eventsData.push(eventData as any);
          }

          collection.lastSyncedAt = new Date();
          collection.dataVersion = (collection.dataVersion || 1) + 1;

          await collection.save();
          updated++;

          // Invalidate cache
          await this.invalidateCollectionCache(collection._id.toString());
        } catch (error) {
          logger.error(`Failed to sync event ${objId} to collection ${collection._id}:`, error);
        }
      }

      logger.info(`Synced event ${objId} to ${updated} collections`);
      return { updated, removed: 0 };

    } catch (error) {
      logger.error(`Error syncing event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Remove event from all collections (when deleted/unapproved)
   */
  async removeEventFromCollections(eventId: string | mongoose.Types.ObjectId) {
    try {
      const objId = typeof eventId === 'string'
        ? new mongoose.Types.ObjectId(eventId)
        : eventId;

      logger.info(`Removing event ${objId} from collections`);

      // Use updateMany with $pull for efficiency
      const result = await Collection.updateMany(
        { 'eventsData._id': objId },
        {
          $pull: { eventsData: { _id: objId } as any },
          $inc: { dataVersion: 1 },
          $set: { lastSyncedAt: new Date() }
        }
      );

      // Also remove from events array (shadow field)
      await Collection.updateMany(
        { 'events': objId },
        {
          $pull: { events: objId }
        }
      );

      // Invalidate all collection caches (pattern delete)
      await cacheService.deletePattern('collection:*');

      logger.info(`Removed event ${objId} from ${result.modifiedCount} collections`);
      return { removed: result.modifiedCount, updated: 0 };

    } catch (error) {
      logger.error(`Error removing event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all events in a collection (for migration or reconciliation)
   */
  async syncCollection(collectionId: string | mongoose.Types.ObjectId) {
    try {
      const collection = await Collection.findById(collectionId);
      if (!collection) {
        logger.warn(`Collection ${collectionId} not found`);
        return null;
      }

      logger.info(`Syncing all events for collection ${collectionId}`);

      // Fetch all event data
      const eventsData = [];
      for (const eventId of collection.events) {
        const eventData = await this.getEventDataForEmbed(eventId);
        if (eventData && eventData.isApproved && eventData.isActive && !eventData.isDeleted) {
          eventsData.push(eventData);
        }
      }

      // Update collection
      collection.eventsData = eventsData as any;
      collection.lastSyncedAt = new Date();
      collection.dataVersion = (collection.dataVersion || 1) + 1;

      await collection.save();

      // Invalidate cache
      await this.invalidateCollectionCache(collection._id.toString());

      logger.info(`Synced ${eventsData.length} events for collection ${collectionId}`);
      return eventsData.length;

    } catch (error) {
      logger.error(`Error syncing collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Full reconciliation: sync all collections
   * Run periodically via cron
   */
  async reconcileAll() {
    try {
      logger.info('Starting full collection reconciliation');

      const collections = await Collection.find({ isActive: true });
      let synced = 0;
      let failed = 0;

      for (const collection of collections) {
        try {
          await this.syncCollection(collection._id.toString());
          synced++;
        } catch (error) {
          logger.error(`Failed to reconcile collection ${collection._id}:`, error);
          failed++;
        }
      }

      logger.info(`Reconciliation complete: ${synced} synced, ${failed} failed`);
      return { synced, failed, total: collections.length };

    } catch (error) {
      logger.error('Error during reconciliation:', error);
      throw error;
    }
  }

  /**
   * Invalidate collection cache
   */
  private async invalidateCollectionCache(collectionId: string) {
    try {
      await cacheService.delete(`collection:${collectionId}`);
      await cacheService.deletePattern('collections:*'); // List caches
    } catch (error) {
      logger.error(`Cache invalidation failed for collection ${collectionId}:`, error);
    }
  }
}

export const collectionSyncService = new CollectionSyncService();
