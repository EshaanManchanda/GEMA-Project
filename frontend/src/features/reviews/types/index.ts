export interface Review {
  _id: string;
  type: 'event' | 'vendor' | 'venue';
  targetId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  media?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  isVerified: boolean;
  helpfulCount: number;
  response?: {
    message: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
