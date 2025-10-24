import express from 'express';
import { catchAsync } from '../middleware';
import currencyService from '../services/currency.service';
import { Request, Response, NextFunction } from 'express';
import { detectCurrency } from '../controllers/currency.controller';

const router = express.Router();

router.get('/detect', detectCurrency);

/**
 * @route   GET /api/currency/rates
 * @desc    Get current exchange rates for all supported currencies
 * @access  Public
 */
router.get('/rates', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const rates = await currencyService.getExchangeRates();

  res.status(200).json({
    success: true,
    data: {
      baseCurrency: currencyService.getBaseCurrency(),
      rates,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route   GET /api/currency/supported
 * @desc    Get list of all supported currencies with their info
 * @access  Public
 */
router.get('/supported', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currencies = currencyService.getSupportedCurrencies();

  res.status(200).json({
    success: true,
    data: currencies,
  });
}));

/**
 * @route   POST /api/currency/convert
 * @desc    Convert amount between two currencies
 * @access  Public
 * @body    { amount, fromCurrency, toCurrency }
 */
router.post('/convert', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { amount, fromCurrency, toCurrency } = req.body;

  if (!amount || !fromCurrency || !toCurrency) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: amount, fromCurrency, toCurrency',
    });
  }

  const convertedAmount = await currencyService.convertCurrency(
    parseFloat(amount),
    fromCurrency,
    toCurrency
  );

  const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency);

  res.status(200).json({
    success: true,
    data: {
      originalAmount: parseFloat(amount),
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate: rate,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route   GET /api/currency/info/:code
 * @desc    Get information about a specific currency
 * @access  Public
 */
router.get('/info/:code', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;
  const currencyInfo = currencyService.getCurrencyInfo(code.toUpperCase());

  if (!currencyInfo) {
    return res.status(404).json({
      success: false,
      message: `Currency ${code} is not supported`,
    });
  }

  res.status(200).json({
    success: true,
    data: currencyInfo,
  });
}));

/**
 * @route   POST /api/currency/refresh
 * @desc    Force refresh of exchange rates (admin only in production)
 * @access  Public (should be protected in production)
 */
router.post('/refresh', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const rates = await currencyService.refreshRates();

  res.status(200).json({
    success: true,
    message: 'Exchange rates refreshed successfully',
    data: {
      baseCurrency: currencyService.getBaseCurrency(),
      rates,
      timestamp: new Date().toISOString(),
    },
  });
}));

export default router;
