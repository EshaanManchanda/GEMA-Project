export const PROMOTION_TIERS = {
  boost: { label: "Boost", days: 7, priceAED: 49 },
  featured: { label: "Featured", days: 30, priceAED: 149 },
  premium: { label: "Premium", days: 90, priceAED: 399 },
} as const;

export type PromotionTier = keyof typeof PROMOTION_TIERS;
