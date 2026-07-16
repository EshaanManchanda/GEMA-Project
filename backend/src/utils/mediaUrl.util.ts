import { config } from "../config/env";

/**
 * Computes the direct Cloudinary CDN URL for a lean-populated media asset,
 * bypassing the `/api/media/file/:uuid` backend proxy (and its 302 redirect).
 *
 * Mirrors the `directUrl` virtual on the MediaAsset model (see
 * `models/MediaAsset.ts`), but works on plain `.lean()` documents where
 * Mongoose virtuals are unavailable. Callers must `.populate(field, "url ... publicId provider")`
 * so `publicId`/`provider` are present on the leaned subdocument.
 *
 * @param asset Leaned, populated media asset (or undefined if population failed)
 * @returns Direct Cloudinary CDN URL when possible, else the original proxy `url`
 */
export function getDirectMediaUrl(
  asset:
    | { url?: string; publicId?: string; provider?: string }
    | null
    | undefined,
): string | undefined {
  if (!asset) return undefined;

  if (
    asset.provider === "cloudinary" &&
    asset.publicId &&
    config.cloudinary.cloudName
  ) {
    return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${asset.publicId}`;
  }

  return asset.url;
}

/**
 * Mutates a lean-populated doc's media asset field in place, adding
 * `directUrl`. No-op if the field is missing/unpopulated.
 */
export function attachDirectUrl<T extends Record<string, any>>(
  doc: T,
  field: string,
): void {
  const asset = doc?.[field];
  if (asset && typeof asset === "object") {
    asset.directUrl = getDirectMediaUrl(asset);
  }
}
