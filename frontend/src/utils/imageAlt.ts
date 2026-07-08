// Shared alt-text fallback logic for rendered <img> elements.
// Single source of truth so banner/blog/event/category/media previews don't
// each invent their own fallback chain.

interface AltTextAsset {
  altText?: string;
}

/**
 * Resolve the alt text to render for an image.
 *
 * Public pages: never fall back to a raw filename (e.g. "IMG_4021.jpg") — it's
 * meaningless to screen readers and looks unpolished. Fall back to a
 * human-authored title/name instead, or "" if nothing is available.
 *
 * @param asset The MediaAsset (or asset-shaped object) that may carry `altText`
 * @param fallbackTitle A human-authored title/name to use when altText is unset
 * @param decorative Pass true for purely decorative UI images — always returns ""
 */
export function getImageAlt(
  asset: AltTextAsset | null | undefined,
  fallbackTitle?: string,
  decorative = false,
): string {
  if (decorative) return '';
  return asset?.altText?.trim() || fallbackTitle?.trim() || '';
}
