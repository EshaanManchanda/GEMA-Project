import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import homepageService from "./homepage.service";

export const getHomepageData = catchAsync(
  async (req: Request, res: Response) => {
    const data = await homepageService.getHomepageData();

    res.status(200).json({
      success: true,
      message: "Homepage data retrieved successfully",
      data,
    });
  },
);

export const invalidateHomepageCache = catchAsync(
  async (req: Request, res: Response) => {
    await homepageService.invalidateCache();

    res.status(200).json({
      success: true,
      message: "Homepage cache invalidated successfully",
    });
  },
);
