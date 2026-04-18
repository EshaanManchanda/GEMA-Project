export { default as MediaAsset } from "./media-asset.model";
export type { IMediaAsset } from "./media-asset.model";

export { MediaService, mediaService } from "./media.service";
export { default as uploadService, UploadService } from "./upload.service";
export type { UploadResult, UploadOptions } from "./upload.service";

export { StorageFactory } from "./storage/StorageFactory";
export { CloudinaryProvider } from "./storage/CloudinaryProvider";
export { LocalProvider } from "./storage/LocalProvider";
export type { IStorageProvider } from "./storage/IStorageProvider";

export * as MediaController from "./media.controller";

export { default as mediaRoutes } from "./media.routes";
export { default as uploadRoutes } from "./upload.routes";

export { default as upload, uploadSingle, uploadMultiple, uploadFields, uploadEventImages, uploadVenueImages, uploadUserAvatar, uploadDocument, uploadQRCode, uploadRegistrationFiles, uploadBlogFeaturedImage, uploadBlogContentMedia, handleUploadError, getFileUrl, deleteFile, validateImageDimensions, getFileInfo } from "./upload.middleware";
