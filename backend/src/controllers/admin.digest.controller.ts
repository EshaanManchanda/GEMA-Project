import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import EmailDigestSettings from "../models/EmailDigestSettings";
import EmailCampaignRecord from "../models/EmailCampaignRecord";
import newsletterDigestService from "../services/communication/newsletterDigest.service";

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
    const payload = req.body || {};

    // 1. Update singleton active settings
    const settings = await EmailDigestSettings.getSettings();
    Object.assign(settings, payload);
    await settings.save();

    // 2. Also save or update as a persistent campaign record for history / editing
    const title =
      payload.title ||
      payload.subject ||
      `${payload.campaignType || "Campaign"} - ${new Date().toLocaleDateString()}`;

    let campaignRecord;
    if (payload.campaignRecordId) {
      campaignRecord = await EmailCampaignRecord.findByIdAndUpdate(
        payload.campaignRecordId,
        { ...payload, title },
        { new: true },
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
    const updated = await EmailCampaignRecord.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updated) {
      res.status(404).json({ success: false, message: "Campaign not found" });
      return;
    }

    // If status was changed to active, sync to EmailDigestSettings so node-cron picks it up
    if (req.body.status === "active") {
      const settings = await EmailDigestSettings.getSettings();
      Object.assign(settings, updated.toObject());
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
    await EmailCampaignRecord.findByIdAndDelete(id);
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
          targetAudience: overrideSettings?.targetAudience || "newsletter_all",
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
