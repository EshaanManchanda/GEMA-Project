import { Router } from "express";
import { handleCunnektWebhook } from "../controllers/cunnekt.webhook.controller";

const router = Router();

// Unauthenticated — verified via the :secret path segment inside the controller
// (Cunnekt sends no signing header). Register the full URL, including secret,
// as the Webhook URL on Cunnekt's API Setting page.
// Raw body parsing for this path prefix is mounted in server.ts before express.json().
router.post("/:secret", handleCunnektWebhook);

export default router;
