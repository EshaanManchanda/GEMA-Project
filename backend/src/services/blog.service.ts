import mongoose from 'mongoose';
import { Blog } from '../models/Blog';
import { IBlog } from '../models/Blog';
import MediaAsset from '../models/MediaAsset';
import { mediaService } from './media.service';

export class BlogService {
  /**
   * Validate that a MediaAsset exists
   */
  private async validateMediaAsset(
    mediaId: string | mongoose.Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<void> {
    const media = await MediaAsset.findById(mediaId).session(session || null);
    if (!media) {
      throw new Error(`MediaAsset ${mediaId} not found`);
    }
  }

  /**
   * Create a new blog with media tracking
   */
  async createBlog(data: Partial<IBlog>): Promise<IBlog> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Validate MediaAsset exists if provided
      if (data.featuredImageAsset) {
        await this.validateMediaAsset(data.featuredImageAsset, session);
      }

      // 2. Create blog
      const blog = new Blog(data);
      await blog.save({ session });

      // 3. Track media usage
      if (data.featuredImageAsset) {
        await mediaService.trackUsage(
          data.featuredImageAsset.toString(),
          'Blog',
          'featuredImageAsset',
          blog._id as mongoose.Types.ObjectId,
          session
        );
      }

      await session.commitTransaction();
      return blog;
    } catch (error: any) {
      await session.abortTransaction();

      // Enhanced error logging
      console.error('=== BLOG SERVICE ERROR (CREATE) ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (error.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
      }

      // Provide specific error messages
      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors || {})
          .map(key => `${key}: ${error.errors[key].message}`)
          .join(', ');
        throw new Error(`Blog validation failed: ${validationErrors}`);
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update a blog with media tracking
   */
  async updateBlog(id: string, data: Partial<IBlog>): Promise<IBlog> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const oldBlog = await Blog.findById(id).session(session);
      if (!oldBlog) {
        throw new Error('Blog not found');
      }

      // 1. Detect media changes
      const oldMediaId = oldBlog.featuredImageAsset?.toString();
      const newMediaId = data.featuredImageAsset?.toString();

      // 2. Validate new media if changed
      if (newMediaId && newMediaId !== oldMediaId) {
        await this.validateMediaAsset(newMediaId, session);
      }

      // 3. Update blog
      Object.assign(oldBlog, data);
      await oldBlog.save({ session });

      // 4. Update media tracking
      if (oldMediaId && oldMediaId !== newMediaId) {
        // Decrement old media usage
        await mediaService.untrackUsage(
          oldMediaId,
          'Blog',
          oldBlog._id as mongoose.Types.ObjectId,
          session
        );
      }

      if (newMediaId && newMediaId !== oldMediaId) {
        // Increment new media usage
        await mediaService.trackUsage(
          newMediaId,
          'Blog',
          'featuredImageAsset',
          oldBlog._id as mongoose.Types.ObjectId,
          session
        );
      }

      await session.commitTransaction();
      return oldBlog;
    } catch (error: any) {
      await session.abortTransaction();

      // Enhanced error logging
      console.error('=== BLOG SERVICE ERROR (UPDATE) ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (error.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
      }

      // Provide specific error messages
      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors || {})
          .map(key => `${key}: ${error.errors[key].message}`)
          .join(', ');
        throw new Error(`Blog validation failed: ${validationErrors}`);
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete a blog with media cleanup
   */
  async deleteBlog(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const blog = await Blog.findById(id).session(session);
      if (!blog) {
        throw new Error('Blog not found');
      }

      // 1. Untrack media usage
      if (blog.featuredImageAsset) {
        await mediaService.untrackUsage(
          blog.featuredImageAsset.toString(),
          'Blog',
          blog._id as mongoose.Types.ObjectId,
          session
        );
      }

      // 2. Delete blog
      await Blog.findByIdAndDelete(id, { session });

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
export const blogService = new BlogService();
