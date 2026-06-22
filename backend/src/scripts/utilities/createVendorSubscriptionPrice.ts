/**
 * One-time idempotent script: create Stripe Product + recurring Price for vendor subscriptions.
 *
 * Usage (from backend/):
 *   npx ts-node src/scripts/utilities/createVendorSubscriptionPrice.ts
 *
 * Copy the printed Price id into STRIPE_VENDOR_SUBSCRIPTION_PRICE_ID in your .env file.
 * Re-running is safe: it looks up existing Product/Price by metadata before creating.
 */

import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const PRODUCT_METADATA_KEY = "kidrove_product";
const PRODUCT_METADATA_VALUE = "vendor_subscription";
const MONTHLY_AMOUNT_AED = 150; // fils: 150 * 100 = 15000

async function main() {
  const secretKey =
    process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error(
      "❌  No Stripe secret key found. Set STRIPE_TEST_SECRET_KEY or STRIPE_SECRET_KEY in .env",
    );
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });

  console.log("🔍  Looking for existing vendor subscription product...");

  // --- Idempotent: find existing product ---
  const existingProducts = await stripe.products.list({ limit: 100, active: true });
  let product = existingProducts.data.find(
    (p) => p.metadata[PRODUCT_METADATA_KEY] === PRODUCT_METADATA_VALUE,
  );

  if (product) {
    console.log(`✅  Found existing product: ${product.id} (${product.name})`);
  } else {
    product = await stripe.products.create({
      name: "Vendor Subscription",
      description:
        "Monthly platform subscription for vendors using their own Stripe account (150 AED/month). Replaces the 5% commission model.",
      metadata: {
        [PRODUCT_METADATA_KEY]: PRODUCT_METADATA_VALUE,
      },
    });
    console.log(`✅  Created product: ${product.id} (${product.name})`);
  }

  // --- Idempotent: find existing monthly price ---
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const existingMonthlyPrice = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.currency === "aed" &&
      p.unit_amount === MONTHLY_AMOUNT_AED * 100,
  );

  let price: Stripe.Price;
  if (existingMonthlyPrice) {
    price = existingMonthlyPrice;
    console.log(`✅  Found existing monthly price: ${price.id}`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: MONTHLY_AMOUNT_AED * 100, // 15000 fils = 150.00 AED
      currency: "aed",
      recurring: {
        interval: "month",
      },
      metadata: {
        plan_type: "monthly",
        [PRODUCT_METADATA_KEY]: PRODUCT_METADATA_VALUE,
      },
    });
    console.log(`✅  Created monthly price: ${price.id}`);
  }

  console.log("\n=================================================");
  console.log("Add this to your .env file:");
  console.log(`STRIPE_VENDOR_SUBSCRIPTION_PRICE_ID=${price.id}`);
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
