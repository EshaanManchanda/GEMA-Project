import { Request, Response } from "express";
import statsService from "./stats.service";

export const getPublicStats = async (req: Request, res: Response) => {
  try {
    const stats = await statsService.getPublicStats();

    res.status(200).json({
      success: true,
      message: "Stats retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching public stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
