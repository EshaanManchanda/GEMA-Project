import { Router } from "express";
import { handleCunnektWebhook } from "../controllers/cunnekt.webhook.controller";

const router = Router();

// Unauthenticated — verified via shared-secret check inside the controller.
// Raw body parsing for this exact path is mounted in server.ts before express.json().
router.post("/", handleCunnektWebhook);

export default router;
