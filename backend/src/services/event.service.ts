import mongoose from 'mongoose';
import Event, { IEvent } from '../models/Event';
import MediaAsset from '../models/MediaAsset';
import { mediaService } from './media.service';

export class EventService {
  /**
   * Validate that all MediaAssets exist
   */
  private async validateMediaAssets(
    mediaIds: mongoose.Types.ObjectId[],
    session?: mongoose.ClientSession
  ): Promise<void> {
    for (const mediaId of mediaIds) {
      const media = await MediaAsset.findById(mediaId).session(session || null);
      if (!media) {
        throw new Error(`MediaAsset ${mediaId} not found`);
      }
    }
  }

  /**
   * Create a new event with media tracking
   */
  async createEvent(data: Partial<IEvent>): Promise<IEvent> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Validate all MediaAssets exist if provided
      if (data.imageAssets && data.imageAssets.length > 0) {
        await this.validateMediaAssets(data.imageAssets, session);
      }

      // 2. Create event
      const event = new Event(data);
      await event.save({ session });

      // 3. Track media usage for all images
      if (data.imageAssets && data.imageAssets.length > 0) {
        for (const imageId of data.imageAssets) {
          await mediaService.trackUsage(
            imageId.toString(),
            'Event',
            'imageAssets',
            event._id as mongoose.Types.ObjectId,
            session
          );
        }
      }

      await session.commitTransaction();
      return event;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update an event with media tracking
   */
  async updateEvent(id: string, data: Partial<IEvent>): Promise<IEvent> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const oldEvent = await Event.findById(id).session(session);
      if (!oldEvent) {
        throw new Error('Event not found');
      }

      // 1. Calculate diff for image changes
      const oldImageIds = (oldEvent.imageAssets || []).map(id => id.toString());
      const newImageIds = (data.imageAssets || []).map(id => id.toString());

      const addedImages = newImageIds.filter(id => !oldImageIds.includes(id));
      const removedImages = oldImageIds.filter(id => !newImageIds.includes(id));

      // 2. Validate new images
      if (addedImages.length > 0) {
        await this.validateMediaAssets(
          addedImages.map(id => new mongoose.Types.ObjectId(id)),
          session
        );
      }

      // 3. Update event
      Object.assign(oldEvent, data);
      await oldEvent.save({ session });

      // 4. Update media tracking
      // Untrack removed images
      for (const imageId of removedImages) {
        await mediaService.untrackUsage(
          imageId,
          'Event',
          oldEvent._id as mongoose.Types.ObjectId,
          session
        );
      }

      // Track added images
      for (const imageId of addedImages) {
        await mediaService.trackUsage(
          imageId,
          'Event',
          'imageAssets',
          oldEvent._id as mongoose.Types.ObjectId,
          session
        );
      }

      await session.commitTransaction();
      return oldEvent;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete an event with media cleanup (HARD DELETE)
   * @deprecated Use hardDeleteEvent() instead for clarity
   */
  async deleteEvent(id: string): Promise<void> {
    return this.hardDeleteEvent(id);
  }

  /**
   * Soft delete an event (archive to trash)
   * Preserves media references for potential restore
   */
  async softDeleteEvent(id: string): Promise<IEvent> {
    const event = await Event.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }

    // Soft delete - set flags only
    event.isDeleted = true;
    event.deletedAt = new Date();
    await event.save();

    // NOTE: Do NOT untrack media usage
    // This allows restoration with intact media references

    return event;
  }

  /**
   * Hard delete an event (permanent removal)
   * Untracks all media usage and removes document
   */
  async hardDeleteEvent(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const event = await Event.findById(id).session(session);
      if (!event) {
        throw new Error('Event not found');
      }

      // 1. Untrack all media usage
      if (event.imageAssets && event.imageAssets.length > 0) {
        for (const imageId of event.imageAssets) {
          await mediaService.untrackUsage(
            imageId.toString(),
            'Event',
            event._id as mongoose.Types.ObjectId,
            session
          );
        }
      }

      // 2. Hard delete event
      await Event.findByIdAndDelete(id, { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// Export singleton instance
export const eventService = new EventService();
