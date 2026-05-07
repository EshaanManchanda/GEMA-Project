import {
  IStorageProvider,
  UploadResult,
  UploadOptions,
} from "./IStorageProvider";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import logger from "../../config/logger";

/**
 * Local Storage Provider
 *
 * Implements the IStorageProvider interface for local file system storage
 */
export class LocalProvider implements IStorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir: string, baseUrl?: string) {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    this.baseUrl = baseUrl || "/api/uploads/files";

    // Ensure upload directory exists
    this.ensureDirectoryExists(this.uploadDir);
  }

  /**
   * Ensure a directory exists, create it if not
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fsSync.existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(originalName: string): string {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .substring(0, 50);

    return `${sanitizedBaseName}-${uniqueSuffix}${fileExtension}`;
  }

  /**
   * Upload a file to local storage
   */
  async upload(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      const { category = "misc", folder } = options;

      // Determine the destination folder
      const subFolder = folder || category;
      const destinationDir = path.join(this.uploadDir, subFolder);

      // Ensure destination directory exists
      await this.ensureDirectoryExists(destinationDir);

      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const filePath = path.join(destinationDir, filename);

      // Save file
      if (file.path) {
        // If multer saved to disk (diskStorage), move it
        await fs.rename(file.path, filePath);
      } else if (file.buffer) {
        // If multer used memory storage, write buffer
        await fs.writeFile(filePath, file.buffer);
      } else {
        throw new Error("File must have either path or buffer");
      }

      // Calculate relative path for URL
      const relativePath = path.relative(this.uploadDir, filePath);
      const url = `${this.baseUrl}/${relativePath.replace(/\\/g, "/")}`;

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        url,
        localPath: relativePath.replace(/\\/g, "/"),
        size: stats.size,
        format: path.extname(file.originalname).substring(1),
      };
    } catch (error: any) {
      logger.error("Local storage upload error:", error);
      return {
        success: false,
        error: error.message || "Failed to upload to local storage",
      };
    }
  }

  /**
   * Delete a file from local storage
   */
  async delete(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, relativePath);

      if (await this.exists(relativePath)) {
        await fs.unlink(fullPath);
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Error deleting from local storage:", error);
      return false;
    }
  }

  /**
   * Get URL for a locally stored file
   */
  getUrl(relativePath: string, transformation?: any): string {
    if (!relativePath) return "";

    // Local storage doesn't support transformations
    // You could integrate with sharp for image transformations if needed
    return `${this.baseUrl}/${relativePath.replace(/\\/g, "/")}`;
  }

  /**
   * Check if a file exists in local storage
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata for a locally stored file
   */
  async getMetadata(relativePath: string): Promise<any> {
    try {
      const fullPath = path.join(this.uploadDir, relativePath);

      if (!(await this.exists(relativePath))) {
        return null;
      }

      const stats = await fs.stat(fullPath);
      const ext = path.extname(relativePath);
      const filename = path.basename(relativePath);

      return {
        path: relativePath,
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        provider: "local",
        format: ext.substring(1),
        url: this.getUrl(relativePath),
      };
    } catch (error) {
      logger.error("Error getting local file metadata:", error);
      return null;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(
    subFolder: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      const folderPath = path.join(this.uploadDir, subFolder);

      if (!fsSync.existsSync(folderPath)) {
        return [];
      }

      const files = await fs.readdir(folderPath);
      const filesWithStats = await Promise.all(
        files.slice(offset, offset + limit).map(async (file) => {
          const fullPath = path.join(folderPath, file);
          const stats = await fs.stat(fullPath);

          if (!stats.isFile()) return null;

          return {
            filename: file,
            path: path.relative(this.uploadDir, fullPath).replace(/\\/g, "/"),
            size: stats.size,
            createdAt: stats.birthtime,
            url: this.getUrl(path.relative(this.uploadDir, fullPath)),
          };
        }),
      );

      return filesWithStats.filter((f) => f !== null);
    } catch (error) {
      logger.error("Error listing local files:", error);
      return [];
    }
  }

  /**
   * Get the total size of files in a directory
   */
  async getDirectorySize(subFolder?: string): Promise<number> {
    try {
      const targetDir = subFolder
        ? path.join(this.uploadDir, subFolder)
        : this.uploadDir;

      let totalSize = 0;
      const files = await fs.readdir(targetDir, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(targetDir, file.name);

        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(
            path.relative(this.uploadDir, filePath),
          );
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error("Error calculating directory size:", error);
      return 0;
    }
  }
}
