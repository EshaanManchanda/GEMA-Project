import { Router } from "express";
const router = Router();
router.get("/sitemap.xml", (_req, res) => res.status(200).send(""));
router.get("/robots.txt", (_req, res) => res.status(200).send(""));
export default router;
