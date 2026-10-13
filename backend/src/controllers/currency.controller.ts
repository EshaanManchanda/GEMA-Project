import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { catchAsync } from "../middleware/index";
import logger from "../config/logger";
import cacheService from "../services/cache.service";

const isPrivateIp = (ip: string) =>
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip) || ip === "localhost";

export const detectCurrency = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Look up the VISITOR's IP (trust proxy is set, so req.ip is the client).
      // Calling ipapi.co/json/ without an IP returned the server's own currency
      // for everyone and burned the shared free quota on every page view.
      const ip = (req.ip || "").replace(/^::ffff:/, "");
      if (!ip || isPrivateIp(ip)) {
        return res.status(404).json({ success: false, message: "Currency not detectable for local address" });
      }
      const cacheKey = `currency:detect:${ip}`;
      const cached = await cacheService.get<string>(cacheKey);
      if (cached) {
        return res.status(200).json({ success: true, data: { currency: cached } });
      }

      const response = await axios.get(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        timeout: 5000,
      });
      const { currency } = response.data;
      if (currency) await cacheService.set(cacheKey, currency, { ttl: 24 * 3600 });

      if (!currency) {
        return res.status(404).json({
          success: false,
          message: "Currency not detected from ipapi.co",
        });
      }

      res.status(200).json({
        success: true,
        data: { currency },
      });
    } catch (error: any) {
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status === 429
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many requests to currency detection service. Please try again later.",
        });
      }
      logger.error("Error detecting currency:", error);
      res.status(500).json({
        success: false,
        message: "Failed to auto-detect currency",
        error: error.message,
      });
    }
  },
);
