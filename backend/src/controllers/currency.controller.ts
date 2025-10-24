import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { catchAsync } from '../middleware';

export const detectCurrency = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await axios.get('https://ipapi.co/json/');
    const { currency } = response.data;

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not detected from ipapi.co',
      });
    }

    res.status(200).json({
      success: true,
      data: { currency },
    });
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests to currency detection service. Please try again later.',
      });
    }
    console.error('Error detecting currency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-detect currency',
      error: error.message,
    });
  }
});