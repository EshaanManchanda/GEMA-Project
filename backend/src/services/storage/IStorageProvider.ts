/**
 * Storage Provider Interface
 *
 * Defines the contract for storage providers (Cloudinary, Local, etc.)
 * This abstraction allows seamless switching between storage backends
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  localPath?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  error?: string;
}

export interface UploadOptions {
  category?: string;
  folder?: string;
  transformation?: any;
  tags?: string[];
  resourceType?: "image" | "video" | "raw" | "auto";
}

export interface IStorageProvider {
  /**
   * Upload a file to the storage provider
   * @param file - The file to upload
   * @param options - Upload options (category, folder, transformations, etc.)
   * @returns Promise<UploadResult>
   */
  upload(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete a file from the storage provider
   * @param identifier - The file identifier (publicId for Cloudinary, path for local)
   * @returns Promise<boolean> - True if deleted successfully
   */
  delete(identifier: string): Promise<boolean>;

  /**
   * Get the URL for a stored file
   * @param identifier - The file identifier
   * @param transformation - Optional transformation options
   * @returns string - The file URL
   */
  getUrl(identifier: string, transformation?: any): string;

  /**
   * Check if a file exists
   * @param identifier - The file identifier
   * @returns Promise<boolean> - True if file exists
   */
  exists(identifier: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param identifier - The file identifier
   * @returns Promise<any> - File metadata
   */
  getMetadata?(identifier: string): Promise<any>;
}
