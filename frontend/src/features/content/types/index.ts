export type { BlogFilters } from '@services/api/blogAPI';
export type { Banner } from '@services/api/bannerAPI';
export type { Reel, ReelsResponse, SingleReelResponse } from '@services/api/reelsAPI';

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}
