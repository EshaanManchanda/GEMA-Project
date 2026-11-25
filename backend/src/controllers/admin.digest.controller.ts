import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import EmailDigestSettings from "../models/EmailDigestSettings";
import EmailCampaignRecord from "../models/EmailCampaignRecord";
import newsletterDigestService from "../services/communication/newsletterDigest.service";

/**
 * The campaign fields an admin may set. Everything else in a body (`_id`,
 * `__v`, timestamps, `lastSent*` delivery tracking that gates the cron,
 * `senderCampaignId`) is dropped: the edit form posts the whole saved record
 * back, and copying its `_id` onto the settings singleton made save() fail.
 * `targetAudience` is left out on purpose: segments are not implemented, every
 * send goes to the whole list (see ALL_LIST_AUDIENCE in newsletterDigest.service).
 */
const CAMPAIGN_FIELDS = [
  "title", "subject", "preheader", "campaignType", "status",
  "autoSend", "scheduleDay", "scheduleTime", "blogMode", "autoBlogCount",
  "selectedBlogIds", "featuredEventId", "secondaryEventIds", "eventCustomMessage",
  "selectedCompetitionSlugs", "competitionCustomMessage", "customBroadcast",
] as const;

const pickCampaignFields = (src: object | null | undefined) => {
  const out: Record<string, unknown> = {};
  const from = (src ?? {}) as Record<string, unknown>;
  for (const k of CAMPAIGN_FIELDS) if (from[k] !== undefined) out[k] = from[k];
  return out;
};

/**
 * @desc    Get current digest and automation builder settings
 * @route   GET /api/admin/communication/email-marketing/digest-settings
 * @access  Private (admin)
 */
export const getEmailDigestSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await EmailDigestSettings.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update digest settings and create/update campaign record
 * @route   PUT /api/admin/communication/email-marketing/digest-settings
 * @access  Private (admin)
 */
export const updateEmailDigestSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body || {};
    const payload = pickCampaignFields(body);

    // 1. Update singleton active settings (title is a record-only field)
    const settings = await EmailDigestSettings.getSettings();
    const { title: _recordTitle, ...settingsFields } = payload;
    Object.assign(settings, settingsFields);
    await settings.save();

    // 2. Also save or update as a persistent campaign record for history / editing
    const title =
      (payload.title as string) ||
      (payload.subject as string) ||
      `${(payload.campaignType as string) || "Campaign"} - ${new Date().toLocaleDateString()}`;

    let campaignRecord;
    if (body.campaignRecordId) {
      campaignRecord = await EmailCampaignRecord.findByIdAndUpdate(
        body.campaignRecordId,
        { ...payload, title },
        { new: true, runValidators: true },
      );
    } else {
      campaignRecord = await EmailCampaignRecord.create({
        ...payload,
        title,
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
      campaignRecord,
      message: "Configuration saved to Campaigns Hub successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all saved email campaigns
 * @route   GET /api/admin/communication/email-marketing/campaigns
 * @access  Private (admin)
 */
export const listEmailCampaigns = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const campaigns = await EmailCampaignRecord.find()
      .sort({ updatedAt: -1 })
      .populate("featuredEventId", "title category price images")
      .lean();
    res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update campaign record status (active / draft / inactive) or details
 * @route   PATCH /api/admin/communication/email-marketing/campaigns/:id
 * @access  Private (admin)
 */
export const updateCampaignRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await EmailCampaignRecord.findByIdAndUpdate(id, pickCampaignFields(req.body), {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404).json({ success: false, message: "Campaign not found" });
      return;
    }

    // If status was changed to active, sync to EmailDigestSettings so node-cron picks it up
    if (req.body.status === "active") {
      const settings = await EmailDigestSettings.getSettings();
      const { title: _title, ...fields } = pickCampaignFields(updated.toObject());
      Object.assign(settings, fields);
      settings.status = "active";
      await settings.save();
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a campaign record
 * @route   DELETE /api/admin/communication/email-marketing/campaigns/:id
 * @access  Private (admin)
 */
export const deleteCampaignRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await EmailCampaignRecord.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Campaign not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate live preview of the digest newsletter
 * @route   POST /api/admin/communication/email-marketing/digest-preview
 * @access  Private (admin)
 */
export const previewEmailDigest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await newsletterDigestService.assembleDigestData(req.body);
    const html = newsletterDigestService.generateHTML(data);
    res.status(200).json({ success: true, data: { ...data, html } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dispatch digest (to all subscribers via Sender or test email)
 * @route   POST /api/admin/communication/email-marketing/digest-dispatch
 * @access  Private (admin)
 */
export const dispatchEmailDigest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { testEmail, testMode, overrideSettings, campaignRecordId } = req.body;
    const recipient = testEmail || (testMode ? req.user?.email : undefined);

    const result = await newsletterDigestService.dispatchDigest({
      testEmail: recipient,
      overrideSettings,
    });

    // If real dispatch, record result on the campaign record
    if (!recipient && result.success) {
      if (campaignRecordId) {
        await EmailCampaignRecord.findByIdAndUpdate(campaignRecordId, {
          lastSentAt: new Date(),
          lastSentStatus: "success",
          lastSentRecipientCount: result.recipientCount || 0,
          senderCampaignId: result.campaignId,
          status: "active",
        });
      } else {
        // Create an entry in records if dispatched directly
        await EmailCampaignRecord.create({
          title: overrideSettings?.subject || "Instant Campaign Blast",
          subject: overrideSettings?.subject || "Instant Campaign Blast",
          campaignType: overrideSettings?.campaignType || "blog_digest",
          targetAudience: "newsletter_all",
          status: "active",
          lastSentAt: new Date(),
          lastSentStatus: "success",
          lastSentRecipientCount: result.recipientCount || 0,
          senderCampaignId: result.campaignId,
        });
      }
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
