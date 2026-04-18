import { Router } from "express";
import currencyRoutes from "../modules/currency/currency.routes";
const router = Router();
router.use("/", currencyRoutes);
export default router;
