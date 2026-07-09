import { Request, Response, NextFunction } from "express";
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationCategory,
} from "../models/index";
import { AppError } from "../middleware/index";
import { config } from "../config/env";
import {
  retryLog,
  dispatch,
  CommunicationJobType,
  NON_RETRYABLE_ERROR_CODES,
} from "../services/communication/communication.service";
import { previewTemplate } from "../services/communication/template.service";
import { getWhatsAppProvider } from "../services/communication/providers/whatsapp.provider";

/**
 * @desc    Current communication provider config (no secrets — booleans/names only)
 * @route   GET /api/admin/communication/settings
 * @access  Private (admin)
 */
export const getCommunicationSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        whatsapp: {
          provider: config.whatsapp.provider,
          configured: Boolean(config.whatsapp.cunnektApiKey),
        },
        emailMarketing: {
          provider: config.emailMarketing.provider,
          configured: Boolean(
            config.emailMarketing.senderApiKey ||
            config.emailMarketing.mailchimpApiKey,
          ),
        },
        communication: {
          testMode: config.communication.testMode,
          queueEnabled: config.communication.queueEnabled,
          logRawProviderResponse: config.communication.logRawProviderResponse,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List communication logs, filterable by channel/status/category/templateKey
 * @route   GET /api/admin/communication/logs
 * @access  Private (admin)
 */
export const listCommunicationLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      channel,
      status,
      category,
      templateKey,
      userId,
      page = "1",
      limit = "25",
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (templateKey) filter.templateKey = templateKey;
    if (userId) filter.userId = userId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);

    const [logs, total] = await Promise.all([
      CommunicationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        // vars/templateSnapshot can carry PII — omit from the list view, full doc is available on demand
        .select("-vars -templateSnapshot -providerResponse"),
      CommunicationLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single communication log with full detail
 * @route   GET /api/admin/communication/logs/:id
 * @access  Private (admin)
 */
export const getCommunicationLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const log = await CommunicationLog.findById(req.params.id);
    if (!log) {
      throw new AppError("Communication log not found", 404);
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Re-enqueue a failed log. Refuses non-retryable failure classes
 *          (invalid phone, missing/disabled template, consent denied, etc).
 * @route   POST /api/admin/communication/logs/:id/retry
 * @access  Private (admin)
 */
export const retryCommunicationLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const log = await retryLog(req.params.id);
    res.status(200).json({ success: true, data: log });
  } catch (error: any) {
    next(new AppError(error.message || "Failed to retry log", 400));
  }
};

/**
 * @desc    Status counts per channel over the last N days — the "stats before
 *          charts" dashboard primitive (raw counts only, no time series yet).
 * @route   GET /api/admin/communication/logs/summary
 * @access  Private (admin)
 */
export const getCommunicationLogsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const days = Math.min(
      Math.max(parseInt(req.query.days as string, 10) || 7, 1),
      90,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await CommunicationLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { channel: "$channel", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const channel = row._id.channel as string;
      const status = row._id.status as string;
      summary[channel] ??= {};
      summary[channel][status] = row.count;
    }

    res.status(200).json({
      success: true,
      data: { sinceDays: days, byChannelAndStatus: summary },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Failure reason codes that can never be retried (for the admin UI to grey out the button)
 * @route   GET /api/admin/communication/retry-policy
 * @access  Private (admin)
 */
export const getRetryPolicy = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: { nonRetryableErrorCodes: Array.from(NON_RETRYABLE_ERROR_CODES) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve + validate a WhatsApp template against sample variables
 *          without sending anything — lets an admin catch a missing
 *          variable before a real test-send.
 * @route   POST /api/admin/communication/whatsapp/preview
 * @access  Private (admin)
 */
export const previewWhatsAppTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { templateKey, vars = {}, languageCode = "en" } = req.body;
    if (!templateKey) {
      throw new AppError("templateKey is required", 400);
    }

    const resolved = await previewTemplate(
      templateKey,
      CommunicationChannel.WHATSAPP,
      vars,
      languageCode,
    );

    res.status(200).json({
      success: true,
      data: {
        providerTemplateName: resolved.template.providerTemplateName,
        purpose: resolved.template.purpose,
        requiredVariables: resolved.template.requiredVariables,
        isEnabled: resolved.template.isEnabled,
        isApprovedOnProvider: resolved.template.isApprovedOnProvider,
        rendered: resolved.rendered,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a real (or dev, if COMMUNICATION_TEST_MODE=true) WhatsApp
 *          test message through the same dispatch() path production
 *          triggers use — exercises template resolution, queueing, and the
 *          provider adapter end to end.
 * @route   POST /api/admin/communication/whatsapp/test
 * @access  Private (admin)
 */
export const testWhatsAppSend = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { to, templateKey, vars = {}, languageCode = "en" } = req.body;
    if (!to || !templateKey) {
      throw new AppError("to and templateKey are required", 400);
    }

    const log = await dispatch({
      jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
      channel: CommunicationChannel.WHATSAPP,
      category: CommunicationCategory.TRANSACTIONAL,
      templateKey,
      to,
      vars,
      languageCode,
      refs: { userId: (req as any).user?._id?.toString() },
      // Admin test-sends are one-off — never dedupe against a real send.
      idempotencyKey: `admin-test:${templateKey}:${to}:${Date.now()}`,
    });

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ping the configured WhatsApp provider's connectivity/auth
 *          (e.g. Cunnekt account endpoint) without sending a message.
 * @route   GET /api/admin/communication/whatsapp/test-connection
 * @access  Private (admin)
 */
export const testWhatsAppConnection = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const provider = getWhatsAppProvider();
    const ok = await provider.testConnection();
    res.status(200).json({
      success: true,
      data: { provider: provider.name, connected: ok },
    });
  } catch (error) {
    next(error);
  }
};
