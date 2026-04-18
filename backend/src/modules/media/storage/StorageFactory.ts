import { config } from "../../../config/env";
import { IStorageProvider } from "./IStorageProvider";
import { CloudinaryProvider } from "./CloudinaryProvider";
import { LocalProvider } from "./LocalProvider";

/**
 * Storage Factory
 *
 * Factory pattern implementation to provide the appropriate storage provider
 * based on environment configuration. Implements singleton pattern to ensure
 * a single instance of the provider is used throughout the application.
 */
export class StorageFactory {
  private static instance: IStorageProvider | null = null;

  /**
   * Get the appropriate storage provider based on configuration
   * @returns IStorageProvider - The storage provider instance
   */
  static getProvider(): IStorageProvider {
    if (!StorageFactory.instance) {
      const provider = config.upload.provider;

      if (provider === "cloudinary") {
        console.log("📦 Initializing Cloudinary storage provider");
        StorageFactory.instance = new CloudinaryProvider();
      } else if (provider === "local") {
        console.log("📂 Initializing Local storage provider");
        const baseUrl = config.upload.baseUrl;
        StorageFactory.instance = new LocalProvider(
          config.upload.path,
          `${baseUrl}/api/uploads/files`,
        );
      } else {
        console.warn(
          `⚠️  Unknown storage provider: ${provider}. Falling back to local storage.`,
        );
        StorageFactory.instance = new LocalProvider(config.upload.path);
      }
    }

    return StorageFactory.instance;
  }

  /**
   * Reset the provider instance (useful for testing or switching providers at runtime)
   */
  static resetProvider(): void {
    StorageFactory.instance = null;
  }

  /**
   * Check if provider is initialized
   * @returns boolean
   */
  static isInitialized(): boolean {
    return StorageFactory.instance !== null;
  }

  /**
   * Get the current provider type
   * @returns 'cloudinary' | 'local' | 'unknown'
   */
  static getProviderType(): "cloudinary" | "local" | "unknown" {
    if (!StorageFactory.instance) {
      return "unknown";
    }

    return config.upload.provider === "cloudinary" ? "cloudinary" : "local";
  }
}

// Export a singleton instance for convenience
export default StorageFactory.getProvider();
