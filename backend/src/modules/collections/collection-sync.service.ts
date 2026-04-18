import mongoose from "mongoose";
import Collection from "./collection.model";
import { Event } from "../../models/index";
import { cacheService } from "../../shared/services/cache.service";
import logger from "../../config/logger";

export class CollectionSyncService {
  private async getEventDataForEmbed(eventId: mongoose.Types.ObjectId) {
    try {
      const event = await Event.findById(eventId)
        .select(
          "_id title description category type venueType price currency " +
            "images imageAssets location.city location.address dateSchedule " +
            "ageRange isFeatured viewsCount averageRating isApproved isActive " +
            "isDeleted status vendorId updatedAt",
        )
        .lean();

      if (!event) return null;

      const limitedEvent = {
        ...event,
        images: event.images?.slice(0, 3) || [],
        imageAssets: event.imageAssets?.slice(0, 5) || [],
        dateSchedule: this.getUpcomingSchedules(event.dateSchedule, 5),
      };

      return limitedEvent;
    } catch (error) {
      logger.error(`Error fetching event data for embed ${eventId}:`, error);
      return null;
    }
  }

  private getUpcomingSchedules(schedules: any[], limit: number) {
    if (!schedules || schedules.length === 0) return [];

    const now = new Date();
    return schedules
      .filter((s) => {
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

  async syncEventToCollections(eventId: string | mongoose.Types.ObjectId) {
    try {
      const objId =
        typeof eventId === "string"
          ? new mongoose.Types.ObjectId(eventId)
          : eventId;

      logger.info(`Syncing event ${objId} to collections`);

      const eventData = await this.getEventDataForEmbed(objId);

      if (!eventData) {
        logger.warn(`Event ${objId} not found, removing from collections`);
        return this.removeEventFromCollections(objId);
      }

      if (!eventData.isApproved || !eventData.isActive || eventData.isDeleted) {
        logger.info(
          `Event ${objId} not approved/active, removing from collections`,
        );
        return this.removeEventFromCollections(objId);
      }

      const collections = await Collection.find({
        events: objId,
      });

      if (collections.length === 0) {
        logger.info(`No collections contain event ${objId}`);
        return { updated: 0, removed: 0 };
      }

      let updated = 0;
      for (const collection of collections) {
        try {
          const eventIndex =
            collection.eventsData?.findIndex(
              (e) => e._id.toString() === objId.toString(),
            ) ?? -1;

          if (!collection.eventsData) {
            collection.eventsData = [];
          }

          if (eventIndex >= 0) {
            collection.eventsData[eventIndex] = eventData as any;
          } else {
            collection.eventsData.push(eventData as any);
          }

          collection.lastSyncedAt = new Date();
          collection.dataVersion = (collection.dataVersion || 1) + 1;

          await collection.save();
          updated++;

          await this.invalidateCollectionCache(collection._id.toString());
        } catch (error) {
          logger.error(
            `Failed to sync event ${objId} to collection ${collection._id}:`,
            error,
          );
        }
      }

      logger.info(`Synced event ${objId} to ${updated} collections`);
      return { updated, removed: 0 };
    } catch (error) {
      logger.error(`Error syncing event ${eventId}:`, error);
      throw error;
    }
  }

  async removeEventFromCollections(eventId: string | mongoose.Types.ObjectId) {
    try {
      const objId =
        typeof eventId === "string"
          ? new mongoose.Types.ObjectId(eventId)
          : eventId;

      logger.info(`Removing event ${objId} from collections`);

      const result = await Collection.updateMany(
        { "eventsData._id": objId },
        {
          $pull: { eventsData: { _id: objId } as any },
          $inc: { dataVersion: 1 },
          $set: { lastSyncedAt: new Date() },
        },
      );

      await Collection.updateMany(
        { events: objId },
        {
          $pull: { events: objId },
        },
      );

      await cacheService.deletePattern("collection:*");

      logger.info(
        `Removed event ${objId} from ${result.modifiedCount} collections`,
      );
      return { removed: result.modifiedCount, updated: 0 };
    } catch (error) {
      logger.error(`Error removing event ${eventId}:`, error);
      throw error;
    }
  }

  async syncCollection(collectionId: string | mongoose.Types.ObjectId) {
    try {
      const collection = await Collection.findById(collectionId);
      if (!collection) {
        logger.warn(`Collection ${collectionId} not found`);
        return null;
      }

      logger.info(`Syncing all events for collection ${collectionId}`);

      const CONCURRENT_EVENTS = 10;
      const eventsData = [];

      for (let i = 0; i < collection.events.length; i += CONCURRENT_EVENTS) {
        const batch = collection.events.slice(i, i + CONCURRENT_EVENTS);

        const batchResults = await Promise.all(
          batch.map((eventId) => this.getEventDataForEmbed(eventId)),
        );

        const validEvents = batchResults.filter(
          (eventData) =>
            eventData &&
            eventData.isApproved &&
            eventData.isActive &&
            !eventData.isDeleted,
        );

        eventsData.push(...validEvents);
      }

      collection.eventsData = eventsData as any;
      collection.lastSyncedAt = new Date();
      collection.dataVersion = (collection.dataVersion || 1) + 1;

      await collection.save();

      await this.invalidateCollectionCache(collection._id.toString());

      logger.info(
        `Synced ${eventsData.length} events for collection ${collectionId}`,
      );
      return eventsData.length;
    } catch (error) {
      logger.error(`Error syncing collection ${collectionId}:`, error);
      throw error;
    }
  }

  async reconcileAll() {
    try {
      logger.info("Starting full collection reconciliation");

      if (mongoose.connection.readyState !== 1) {
        throw new Error(
          `MongoDB not connected (readyState: ${mongoose.connection.readyState})`,
        );
      }

      await mongoose.connection.db.admin().ping();
      logger.info("MongoDB connection health check passed");

      const BATCH_SIZE = 5;
      let synced = 0;
      let failed = 0;
      let totalProcessed = 0;
      const startTime = Date.now();

      const cursor = Collection.find({ isActive: true })
        .select("_id title events")
        .lean()
        .cursor({ batchSize: BATCH_SIZE });

      logger.info(`Processing collections in batches of ${BATCH_SIZE}`);

      for await (const collection of cursor) {
        totalProcessed++;
        try {
          logger.info(
            `[${totalProcessed}] Syncing: "${collection.title}" (${collection._id})`,
          );
          await this.syncCollection(collection._id.toString());
          synced++;

          if (totalProcessed % 10 === 0) {
            logger.info(
              `Progress: ${totalProcessed} processed, ${synced} synced, ${failed} failed`,
            );
          }
        } catch (error) {
          logger.error(
            `Failed to reconcile collection ${collection._id}:`,
            error,
          );
          failed++;
        }
      }

      const duration = Date.now() - startTime;
      const avgTimePerCollection =
        totalProcessed > 0 ? (duration / totalProcessed).toFixed(2) : 0;

      logger.info(
        `Reconciliation complete: ${synced} synced, ${failed} failed, ${totalProcessed} total`,
      );
      logger.info(
        `Duration: ${(duration / 1000).toFixed(2)}s, Avg per collection: ${avgTimePerCollection}ms`,
      );

      if (duration > 300000) {
        logger.warn(
          `Reconciliation took ${(duration / 60000).toFixed(2)} minutes - consider optimizing`,
        );
      }

      return { synced, failed, total: totalProcessed, durationMs: duration };
    } catch (error) {
      logger.error("Error during reconciliation:", error);
      throw error;
    }
  }

  private async invalidateCollectionCache(collectionId: string) {
    try {
      await cacheService.delete(`collection:${collectionId}`);
      await cacheService.deletePattern("collections:*");
    } catch (error) {
      logger.error(
        `Cache invalidation failed for collection ${collectionId}:`,
        error,
      );
    }
  }
}

export const collectionSyncService = new CollectionSyncService();
