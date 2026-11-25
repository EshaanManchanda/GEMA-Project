import mongoose from "mongoose";
import { Blog } from "../../models/Blog";
import Event from "../../models/Event";
import EmailDigestSettings, {
  IEmailDigestSettings,
  CampaignPurpose,
  TargetAudience,
} from "../../models/EmailDigestSettings";
import { getEmailMarketingConfig } from "./emailMarketingConfig.service";
import emailService from "../email.service";
import logger from "../../config/logger";
import { escapeHtml } from "../../utils/htmlHelpers";

// Blog/event text is written by vendors and authors, and this HTML is emailed to every
// subscriber and rendered in the admin preview iframe: escape every interpolated value.
// customBroadcast.bodyHtml is the one deliberate exception (admin-authored HTML).
const esc = (v: unknown): string => (v === undefined || v === null ? "" : escapeHtml(String(v)));
const SAFE_URL = /^https?:\/\//i;

// A provider that never answers must not hold the admin request or the cron tick open.
export const PROVIDER_TIMEOUT_MS = 20_000;

/**
 * Audience segments are not implemented: Sender sends to the configured group and
 * Mailchimp to the configured audience, i.e. the whole marketing list. The stored
 * targetAudience is always forced to "newsletter_all" so nothing claims otherwise.
 */
export const ALL_LIST_AUDIENCE: TargetAudience = "newsletter_all";
export const ALL_LIST_LABEL = "all subscribers on the email-marketing list";

// Official Competitions mapping from /competitions
export const OFFICIAL_COMPETITIONS = [
  {
    slug: "national-day-art-competition",
    title: "Eid Al Etihad National Day Children's Art Competition 2026",
    badge: "🇦🇪 UAE National Day",
    category: "Traditional Art",
    grades: "Grades K–12",
    description: "Honoring UAE National Day across all 7 Emirates. Students express patriotism through drawings, colourings, and paintings.",
    image: "/assets/nationalart.png",
    link: "/competitions/national-day-art-competition",
    deadline: "15 Dec 2026",
  },
  {
    slug: "ai-art-competition",
    title: "KidRove AI Art Competition 2026",
    badge: "🚀 AI & Creative Tech",
    category: "Digital Art & AI",
    grades: "Grades K–12",
    description: "Empowering students to harness ethical Generative AI tools to produce visionary creative artworks.",
    image: "/assets/dubb.png",
    link: "/competitions/ai-art-competition",
    deadline: "10 Nov 2026",
  },
  {
    slug: "gcc-reel-challenge",
    title: "GCC Through My Lens — Reel Challenge 2027",
    badge: "📱 GCC Mobile Reel Challenge",
    category: "Mobile Video & Filmmaking",
    grades: "Grades K–12",
    description: "A regional mobile video reel competition celebrating the joyful moments of Ramadan and Eid across all 6 GCC nations.",
    image: "/assets/ramdan.png",
    link: "/competitions/gcc-reel-challenge",
    deadline: "February 2027",
  },
  {
    slug: "young-voices-of-the-gcc",
    title: "Young Voices of the GCC 2027",
    badge: "🌍 GCC Creative Writing",
    category: "Creative Writing",
    grades: "Grades 3–12",
    description: "A regional short-story writing competition for young authors celebrating Gulf culture and traditions.",
    image: "/assets/gulf.png",
    link: "/competitions/young-voices-of-the-gcc",
    deadline: "January 2027",
  },
];

export interface AssembledCampaignData {
  campaignType: CampaignPurpose;
  targetAudience: TargetAudience;
  subject: string;
  preheader?: string;
  audienceLabel: string;
  blogs?: Array<{
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    image: string;
    category?: string;
    publishedAt?: Date;
  }>;
  featuredEvent?: {
    _id: string;
    title: string;
    slug: string;
    description: string;
    image: string;
    category?: string;
    price?: number;
    currency?: string;
    location?: string;
    dateRange?: string;
  };
  secondaryEvents?: Array<{
    _id: string;
    title: string;
    slug: string;
    description: string;
    image: string;
    price?: number;
    currency?: string;
  }>;
  eventCustomMessage?: string;
  competitions?: typeof OFFICIAL_COMPETITIONS;
  competitionCustomMessage?: string;
  customBroadcast?: {
    heroTitle: string;
    heroSubtitle: string;
    bodyHtml: string;
    ctaText: string;
    ctaUrl: string;
  };
}

export class NewsletterDigestService {
  /**
   * Audience label mapping
   */
  getAudienceLabel(_audience?: TargetAudience): string {
    return ALL_LIST_LABEL;
  }

  /**
   * Assemble campaign data tailored specifically to the chosen Campaign Purpose
   */
  async assembleDigestData(overrideSettings?: Partial<IEmailDigestSettings>): Promise<AssembledCampaignData> {
    const settings = overrideSettings
      ? ({ ...(await EmailDigestSettings.getSettings()).toObject(), ...overrideSettings } as IEmailDigestSettings)
      : await EmailDigestSettings.getSettings();

    const campaignType: CampaignPurpose = settings.campaignType || "blog_digest";
    const targetAudience: TargetAudience = ALL_LIST_AUDIENCE;

    const assembled: AssembledCampaignData = {
      campaignType,
      targetAudience,
      subject: settings.subject || "✨ Updates from Kidrove",
      preheader: settings.preheader,
      audienceLabel: this.getAudienceLabel(targetAudience),
    };

    // 1. BLOG DIGEST (Dedicated 6 to 8 blogs)
    if (campaignType === "blog_digest") {
      let blogsQuery;
      if (settings.blogMode === "manual" && settings.selectedBlogIds?.length > 0) {
        blogsQuery = Blog.find({
          _id: { $in: settings.selectedBlogIds },
          status: "published",
        }).populate("featuredImageAsset category");
      } else {
        const count = settings.autoBlogCount || 6;
        blogsQuery = Blog.find({ status: "published" })
          .sort({ publishedAt: -1 })
          .limit(count)
          .populate("featuredImageAsset category");
      }
      const rawBlogs = await blogsQuery.lean();

      assembled.blogs = rawBlogs.map((b: any) => {
        let imageUrl = b.featuredImage || "";
        if (b.featuredImageAsset && typeof b.featuredImageAsset === "object") {
          imageUrl = b.featuredImageAsset.url || imageUrl;
        }
        return {
          _id: String(b._id),
          title: b.title,
          slug: b.slug,
          excerpt:
            b.excerpt ||
            b.metaDescription ||
            (b.content ? b.content.replace(/<[^>]+>/g, "").slice(0, 110) + "..." : ""),
          image: imageUrl,
          category: b.category?.name || "General",
          publishedAt: b.publishedAt,
        };
      });
    }

    // 2. EVENT / CAMP SPOTLIGHT (e.g. Winter Camp 2026)
    if (campaignType === "event_spotlight") {
      assembled.eventCustomMessage = settings.eventCustomMessage;

      // Primary featured event
      let featuredEventDoc = null;
      if (settings.featuredEventId) {
        featuredEventDoc = await Event.findOne({ _id: settings.featuredEventId, status: "published" }).lean();
      }
      if (!featuredEventDoc) {
        featuredEventDoc = await Event.findOne({
          category: { $in: ["camp", "workshop", "event"] },
          status: "published",
        })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (featuredEventDoc) {
        const e = featuredEventDoc as any;
        assembled.featuredEvent = {
          _id: String(e._id),
          title: e.title,
          slug: e.slug || e._id,
          description: e.description ? e.description.replace(/<[^>]+>/g, "").slice(0, 200) + "..." : "",
          image: e.images?.[0] || e.coverImage || "",
          category: e.category,
          price: e.price,
          currency: e.currency || "AED",
          location: e.location?.address || e.location?.city || "Dubai, UAE",
          dateRange: e.dateSchedule?.[0]
            ? `${new Date(e.dateSchedule[0].startDate).toLocaleDateString()} - ${new Date(e.dateSchedule[0].endDate).toLocaleDateString()}`
            : undefined,
        };
      }

      // Secondary events (optional 2 other events)
      if (settings.secondaryEventIds?.length) {
        const secDocs = await Event.find({
          _id: { $in: settings.secondaryEventIds },
          status: "published",
        }).lean();
        assembled.secondaryEvents = secDocs.map((s: any) => ({
          _id: String(s._id),
          title: s.title,
          slug: s.slug || s._id,
          description: s.description ? s.description.replace(/<[^>]+>/g, "").slice(0, 90) + "..." : "",
          image: s.images?.[0] || s.coverImage || "",
          price: s.price,
          currency: s.currency || "AED",
        }));
      }
    }

    // 3. COMPETITION ANNOUNCEMENT
    if (campaignType === "competition_announcement") {
      assembled.competitionCustomMessage = settings.competitionCustomMessage;
      const slugs = settings.selectedCompetitionSlugs || [];
      if (slugs.length > 0) {
        assembled.competitions = OFFICIAL_COMPETITIONS.filter((c) => slugs.includes(c.slug));
      } else {
        assembled.competitions = OFFICIAL_COMPETITIONS.slice(0, 2);
      }
    }

    // 4. CUSTOM BROADCAST
    if (campaignType === "custom_broadcast") {
      assembled.customBroadcast = settings.customBroadcast || {
        heroTitle: "Important Announcement from Kidrove",
        heroSubtitle: "",
        bodyHtml: "<p>We have exciting updates to share with our community...</p>",
        ctaText: "Visit Kidrove",
        ctaUrl: "https://kidrove.com",
      };
    }

    return assembled;
  }

  /**
   * Generates clean, professional, focused HTML for each campaign type
   */
  generateHTML(data: AssembledCampaignData): string {
    const frontendUrl = process.env.FRONTEND_URL || "https://kidrove.com";

    let bodyContentHtml = "";

    // TEMPLATE 1: BLOG DIGEST (Clean, Editorial, Magazine-Style)
    if (data.campaignType === "blog_digest" && data.blogs) {
      bodyContentHtml = `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">This Week's Best Reads 📚</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0;">Handpicked stories, parenting guides, and learning insights from Kidrove.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 16px;">
            ${data.blogs
              .map(
                (b, idx) => `
              <tr>
                <td style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; vertical-align: top;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      ${
                        b.image
                          ? `<td width="115" style="vertical-align: top; padding-right: 18px;">
                              <img src="${esc(b.image)}" alt="${esc(b.title)}" width="115" height="85" style="border-radius: 8px; object-fit: cover; display: block;" />
                            </td>`
                          : ""
                      }
                      <td style="vertical-align: top;">
                        <span style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 4px;">${esc(b.category)}</span>
                        <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; line-height: 1.3;">
                          <a href="${frontendUrl}/blog/${esc(b.slug)}" style="color: #0f172a; text-decoration: none;">${esc(b.title)}</a>
                        </h3>
                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; line-height: 1.5;">${esc(b.excerpt)}</p>
                        <a href="${frontendUrl}/blog/${esc(b.slug)}" style="color: #0284c7; font-size: 13px; font-weight: 600; text-decoration: none;">Read full story →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            `,
              )
              .join("")}
          </table>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${frontendUrl}/blog" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;">Explore All Articles on Kidrove</a>
          </div>
        </div>
      `;
    }

    // TEMPLATE 2: EVENT / CAMP SPOTLIGHT (High-Impact Hero Flyer)
    if (data.campaignType === "event_spotlight" && data.featuredEvent) {
      const e = data.featuredEvent;
      bodyContentHtml = `
        <div style="margin-bottom: 24px;">
          ${
            data.eventCustomMessage
              ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #1e3a8a; line-height: 1.5;">${esc(data.eventCustomMessage)}</div>`
              : ""
          }

          <!-- Main Hero Card -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            ${
              e.image
                ? `<img src="${esc(e.image)}" alt="${esc(e.title)}" width="100%" style="max-height: 280px; object-fit: cover; display: block;" />`
                : ""
            }
            <div style="padding: 24px;">
              <span style="display: inline-block; background: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 10px;">
                ${esc(e.category) || "Special Activity"}
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; line-height: 1.3;">${esc(e.title)}</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 18px 0;">${esc(e.description)}</p>
              
              <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
                <table width="100%">
                  <tr>
                    <td style="font-size: 13px; color: #64748b;">📍 <strong>Location:</strong> ${esc(e.location) || "Dubai, UAE"}</td>
                    <td align="right" style="font-size: 16px; font-weight: 800; color: #0284c7;">${e.price ? `${esc(e.currency)} ${esc(String(e.price))}` : "Free"}</td>
                  </tr>
                  ${e.dateRange ? `<tr><td colspan="2" style="font-size: 13px; color: #64748b; padding-top: 6px;">📅 <strong>Dates:</strong> ${esc(e.dateRange)}</td></tr>` : ""}
                </table>
              </div>

              <div style="text-align: center;">
                <a href="${frontendUrl}/events/${esc(String(e.slug))}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 2px 6px rgba(2,132,199,0.3);">Book Your Child's Spot Now →</a>
              </div>
            </div>
          </div>

          <!-- Secondary events (if any) -->
          ${
            data.secondaryEvents && data.secondaryEvents.length > 0
              ? `
              <div style="margin-top: 36px;">
                <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 14px;">More Upcoming Activities</h3>
                <div style="display: flex; gap: 12px;">
                  ${data.secondaryEvents
                    .map(
                      (s) => `
                    <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                      <h4 style="font-size: 14px; margin: 0 0 6px 0;"><a href="${frontendUrl}/events/${esc(String(s.slug))}" style="color: #0284c7; text-decoration: none;">${esc(s.title)}</a></h4>
                      <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">${esc(s.description)}</p>
                      <a href="${frontendUrl}/events/${esc(String(s.slug))}" style="font-size: 12px; color: #0284c7; font-weight: 600; text-decoration: none;">View Details →</a>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>`
              : ""
          }
        </div>
      `;
    }

    // TEMPLATE 3: COMPETITION ANNOUNCEMENT
    if (data.campaignType === "competition_announcement" && data.competitions) {
      bodyContentHtml = `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Prestigious Student Competitions 🏆</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0;">Empowering youth in art, technology, creative writing, and media.</p>

          ${
            data.competitionCustomMessage
              ? `<div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #581c87; line-height: 1.5;">${esc(data.competitionCustomMessage)}</div>`
              : ""
          }

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 16px;">
            ${data.competitions
              .map(
                (c) => `
              <tr>
                <td style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; vertical-align: top;">
                  <span style="font-size: 11px; font-weight: 700; color: #7c3aed; background: #f3e8ff; padding: 4px 10px; border-radius: 12px; display: inline-block; margin-bottom: 8px;">${c.badge}</span>
                  <h3 style="margin: 0 0 6px 0; font-size: 17px; font-weight: 700; color: #0f172a;">
                    <a href="${frontendUrl}${c.link}" style="color: #0f172a; text-decoration: none;">${c.title}</a>
                  </h3>
                  <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">${c.description}</p>
                  
                  <table width="100%">
                    <tr>
                      <td style="font-size: 12px; color: #475569;">🎓 <strong>Eligibility:</strong> ${c.grades}</td>
                      <td align="right" style="font-size: 12px; color: #e11d48; font-weight: 600;">⏳ Deadline: ${c.deadline}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 14px;">
                    <a href="${frontendUrl}${c.link}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none;">Submit Student Entry →</a>
                  </div>
                </td>
              </tr>
            `,
              )
              .join("")}
          </table>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${frontendUrl}/competitions" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;">View All Competitions</a>
          </div>
        </div>
      `;
    }

    // TEMPLATE 4: CUSTOM BROADCAST
    if (data.campaignType === "custom_broadcast" && data.customBroadcast) {
      const b = data.customBroadcast;
      bodyContentHtml = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; margin-bottom: 24px;">
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${esc(b.heroTitle)}</h2>
          ${b.heroSubtitle ? `<p style="font-size: 15px; color: #64748b; margin: 0 0 18px 0;">${esc(b.heroSubtitle)}</p>` : ""}
          <div style="font-size: 14px; color: #334155; line-height: 1.7; margin: 18px 0;">
            ${b.bodyHtml}
          </div>
          ${
            b.ctaText && SAFE_URL.test(b.ctaUrl || "")
              ? `<div style="text-align: center; margin-top: 24px;">
                  <a href="${esc(b.ctaUrl)}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;">${esc(b.ctaText)}</a>
                </div>`
              : ""
          }
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${esc(data.subject)}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; padding: 32px 24px;">
                
                <!-- Logo & Brand Header -->
                <tr>
                  <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
                    <a href="${frontendUrl}" target="_blank" style="text-decoration: none;">
                      <span style="font-size: 26px; font-weight: 800; color: #0284c7; letter-spacing: -0.03em;">Kidrove</span>
                    </a>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Connecting Children to Activities & Opportunities</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding-top: 24px;">
                    ${bodyContentHtml}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
                      You received this email because you are subscribed to updates on <a href="${frontendUrl}" style="color: #64748b; text-decoration: underline;">Kidrove</a>.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                      Kidrove • Dubai, United Arab Emirates
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Dispatch campaign via Sender.net (or test email)
   */
  async dispatchDigest(options: {
    testEmail?: string;
    overrideSettings?: Partial<IEmailDigestSettings>;
  }): Promise<{ success: boolean; recipientCount?: number; campaignId?: string; message: string }> {
    const data = await this.assembleDigestData(options.overrideSettings);
    const html = this.generateHTML(data);
    const cfg = await getEmailMarketingConfig();

    // 1. Test Mode (Send to admin/specified email only)
    if (options.testEmail) {
      await emailService.sendEmail({
        to: options.testEmail,
        subject: `[TEST PREVIEW] ${data.subject}`,
        html,
      });
      return {
        success: true,
        recipientCount: 1,
        message: `Test email successfully sent to ${options.testEmail}`,
      };
    }

    // 2. Real Bulk Sending via Sender.net
    if (cfg.provider === "sender" && cfg.senderApiKey && cfg.senderListId) {
      try {
        const replyToEmail = process.env.SENDER_FROM_EMAIL || "newsletter@kidrove.com";
        const senderName = "Kidrove";

        // Step A: Create Campaign in Sender
        const createRes = await fetch("https://api.sender.net/v2/campaigns", {
          method: "POST",
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          headers: {
            Authorization: `Bearer ${cfg.senderApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            title: `Kidrove [${data.campaignType}] - ${new Date().toISOString().slice(0, 10)}`,
            subject: data.subject,
            from: senderName,
            reply_to: replyToEmail,
            editor: "html",
            content: html,
            groups: [cfg.senderListId],
          }),
        });

        const createData = (await createRes.json()) as any;
        if (!createRes.ok) {
          const detail = createData?.errors
            ? Object.values(createData.errors).flat().join(", ")
            : createData?.message;
          throw new Error(detail || `Sender campaign creation failed with status ${createRes.status}`);
        }

        const campaignId = createData?.data?.id || createData?.id;
        if (!campaignId) {
          throw new Error("Sender campaign created but returned no campaign ID.");
        }

        // Step B: Send the campaign
        const sendRes = await fetch(`https://api.sender.net/v2/campaigns/${campaignId}/send`, {
          method: "POST",
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          headers: {
            Authorization: `Bearer ${cfg.senderApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        const sendData = (await sendRes.json()) as any;
        if (!sendRes.ok) {
          const detail = sendData?.errors
            ? Object.values(sendData.errors).flat().join(", ")
            : sendData?.message;
          throw new Error(detail || `Sender campaign send failed with status ${sendRes.status}`);
        }

        // Update settings last sent stats
        await EmailDigestSettings.updateOne(
          {},
          {
            lastSentAt: new Date(),
            lastSentStatus: "success",
            lastSentRecipientCount: sendData?.data?.recipient_count || 0,
            lastSentCampaignType: data.campaignType,
          },
        );

        return {
          success: true,
          campaignId,
          recipientCount: sendData?.data?.recipient_count,
          message: `Campaign (${data.campaignType}) dispatched to ${data.audienceLabel} via Sender.net!`,
        };
      } catch (error: any) {
        logger.error("Sender campaign dispatch failed:", error);
        await EmailDigestSettings.updateOne({}, { lastSentAt: new Date(), lastSentStatus: "failed" });
        throw error;
      }
    }

    // 3. Real Bulk Sending via Mailchimp API v3
    if (cfg.provider === "mailchimp" && cfg.mailchimpApiKey && cfg.mailchimpAudienceId) {
      try {
        const prefix =
          cfg.mailchimpServerPrefix || cfg.mailchimpApiKey.split("-")[1] || "";
        if (!prefix) {
          throw new Error("Mailchimp server prefix is missing (e.g. us21).");
        }

        const baseUrl = `https://${prefix}.api.mailchimp.com/3.0`;
        const authHeader = `Basic ${Buffer.from(`anystring:${cfg.mailchimpApiKey}`).toString("base64")}`;
        const replyToEmail = process.env.MAILCHIMP_FROM_EMAIL || "newsletter@kidrove.com";
        const senderName = "Kidrove";

        // Step A: Create Regular Campaign in Mailchimp
        const createCampRes = await fetch(`${baseUrl}/campaigns`, {
          method: "POST",
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "regular",
            recipients: {
              list_id: cfg.mailchimpAudienceId,
            },
            settings: {
              subject_line: data.subject,
              preview_text: data.preheader || "Updates from Kidrove",
              title: `Kidrove [${data.campaignType}] - ${new Date().toISOString().slice(0, 10)}`,
              from_name: senderName,
              reply_to: replyToEmail,
            },
          }),
        });

        const campData: any = await createCampRes.json().catch(() => ({}));
        if (!createCampRes.ok) {
          const detail = campData?.detail || campData?.title || `Status ${createCampRes.status}`;
          throw new Error(`Mailchimp campaign creation failed: ${detail}`);
        }

        const campaignId = campData?.id;
        if (!campaignId) {
          throw new Error("Mailchimp campaign created but returned no campaign ID.");
        }

        // Step B: Set Campaign HTML Content
        const setContentRes = await fetch(`${baseUrl}/campaigns/${campaignId}/content`, {
          method: "PUT",
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html,
          }),
        });

        const contentData: any = await setContentRes.json().catch(() => ({}));
        if (!setContentRes.ok) {
          const detail = contentData?.detail || contentData?.title || `Status ${setContentRes.status}`;
          throw new Error(`Mailchimp content setup failed: ${detail}`);
        }

        // Step C: Send the Campaign immediately
        const sendCampRes = await fetch(`${baseUrl}/campaigns/${campaignId}/actions/send`, {
          method: "POST",
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        });

        if (!sendCampRes.ok) {
          const sendErr: any = await sendCampRes.json().catch(() => ({}));
          const detail = sendErr?.detail || sendErr?.title || `Status ${sendCampRes.status}`;
          throw new Error(`Mailchimp campaign send failed: ${detail}`);
        }

        // Update settings last sent stats
        await EmailDigestSettings.updateOne(
          {},
          {
            lastSentAt: new Date(),
            lastSentStatus: "success",
            lastSentRecipientCount: campData?.emails_sent || 0,
            lastSentCampaignType: data.campaignType,
          },
        );

        return {
          success: true,
          campaignId,
          recipientCount: campData?.emails_sent || 0,
          message: `Campaign (${data.campaignType}) dispatched to ${data.audienceLabel} via Mailchimp!`,
        };
      } catch (error: any) {
        logger.error("Mailchimp campaign dispatch failed:", error);
        await EmailDigestSettings.updateOne({}, { lastSentAt: new Date(), lastSentStatus: "failed" });
        throw error;
      }
    }

    // 3. Dev / Fallback Mode (Simulated or Local)
    logger.info("Email marketing provider is dev or credentials missing. Simulated dispatch.");
    await EmailDigestSettings.updateOne(
      {},
      {
        lastSentAt: new Date(),
        lastSentStatus: "success",
        lastSentRecipientCount: 0,
        lastSentCampaignType: data.campaignType,
      },
    );

    return {
      success: true,
      recipientCount: 0,
      message: `Digest (${data.campaignType}) processed in simulated/development mode.`,
    };
  }
}

export const newsletterDigestService = new NewsletterDigestService();
export default newsletterDigestService;
