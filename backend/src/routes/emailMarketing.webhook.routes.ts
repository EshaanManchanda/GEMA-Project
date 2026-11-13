import express from "express";
import {
  handleEmailMarketingWebhook,
  pingEmailMarketingWebhook,
} from "../controllers/emailMarketing.webhook.controller";

const router = express.Router();

// Mailchimp posts application/x-www-form-urlencoded with PHP-style nested keys
// (data[email]); extended parsing turns that into body.data.email.
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.get("/:provider/:secret", pingEmailMarketingWebhook);
router.post("/:provider/:secret", handleEmailMarketingWebhook);

export default router;
