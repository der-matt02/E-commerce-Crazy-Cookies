export interface Review {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
  };
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string | null;
  images: ReviewImage[];
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewImage {
  id: string;
  reviewId: string;
  url: string;
  createdAt: string;
}

export interface CreateReviewDto {
  customerName: string;
  customerEmail: string;
  rating: number;
  comment?: string;
}

export interface ApproveReviewDto {
  isApproved: boolean;
}

export interface RatingStats {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
