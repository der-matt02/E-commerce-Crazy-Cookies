'use client';

import { reviewsApi } from '@/features/reviews/api/reviews-api';
import { ReviewForm } from './ReviewForm';
import type { CreateReviewDto } from '@/types/review.types';

interface ReviewSectionClientProps {
  productId: string;
}

export function ReviewSectionClient({ productId }: ReviewSectionClientProps) {
  const handleSubmit = async (dto: CreateReviewDto) => {
    await reviewsApi.createForProduct(productId, dto);
  };

  return <ReviewForm productId={productId} onSubmit={handleSubmit} />;
}
