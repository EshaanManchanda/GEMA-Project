import SEOContent, { ISEOContent } from "../models/SEOContent";
import { AppError } from "../middleware/error";

class SEOContentService {
  /**
   * Public: Get SEO content for a specific page
   */
  async getPublicSEOContent(page: string): Promise<ISEOContent | null> {
    return (await SEOContent.findOne({
      page,
      isActive: true,
    }).lean()) as unknown as ISEOContent | null;
  }

  /**
   * Admin: Get all SEO content
   */
  async getAllSEOContent(filters: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, page = 1, limit = 20 } = filters;

    const query: any = {};

    if (search) {
      query.$or = [
        { metaTitle: new RegExp(search, "i") },
        { metaDescription: new RegExp(search, "i") },
        { "faqItems.question": new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;

    const [seoContents, total] = await Promise.all([
      SEOContent.find(query)
        .populate("updatedBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SEOContent.countDocuments(query),
    ]);

    return {
      seoContents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get SEO content by page
   */
  async getSEOContentByPage(page: string): Promise<ISEOContent | null> {
    return await SEOContent.findOne({ page }).populate(
      "updatedBy",
      "firstName lastName email",
    );
  }

  /**
   * Admin: Create SEO content
   */
  async createSEOContent(
    data: Partial<ISEOContent>,
    userId: string,
  ): Promise<ISEOContent> {
    // Check if content for this page already exists
    const existing = await SEOContent.findOne({ page: data.page });
    if (existing) {
      throw new AppError(
        `SEO content for ${data.page} already exists. Use update instead.`,
        400,
      );
    }

    const seoContent = await SEOContent.create({
      ...data,
      updatedBy: userId,
    });

    return seoContent;
  }

  /**
   * Admin: Update SEO content
   */
  async updateSEOContent(
    page: string,
    data: Partial<ISEOContent>,
    userId: string,
  ): Promise<ISEOContent | null> {
    const seoContent = await SEOContent.findOne({ page });

    if (!seoContent) {
      throw new AppError(`SEO content for ${page} not found`, 404);
    }

    Object.assign(seoContent, {
      ...data,
      updatedBy: userId,
    });

    await seoContent.save();
    return seoContent;
  }

  /**
   * Admin: Delete SEO content
   */
  async deleteSEOContent(page: string): Promise<void> {
    const seoContent = await SEOContent.findOne({ page });

    if (!seoContent) {
      throw new AppError(`SEO content for ${page} not found`, 404);
    }

    await SEOContent.deleteOne({ page });
  }
}

export const seoContentService = new SEOContentService();
