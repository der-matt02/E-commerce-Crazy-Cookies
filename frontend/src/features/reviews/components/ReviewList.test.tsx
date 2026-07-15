import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewList } from './ReviewList';
import type { Review } from '@/types/review.types';

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'review-1',
    productId: 'product-1',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    rating: 4,
    comment: 'Muy rico',
    images: [],
    isApproved: true,
    approvedBy: null,
    approvedAt: null,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('ReviewList', () => {
  it('renders the empty state when there are no reviews', () => {
    render(<ReviewList reviews={[]} />);

    expect(screen.getByText('Aún no hay reviews para este producto')).toBeInTheDocument();
    expect(screen.getByText('¡Sé el primero en dejar una opinión!')).toBeInTheDocument();
  });

  it('renders a list of reviews with customer name and comment', () => {
    const reviews = [
      makeReview({ id: 'r1', customerName: 'Jane Doe', comment: 'Muy rico' }),
      makeReview({ id: 'r2', customerName: 'John Smith', comment: 'Excelente' }),
    ];

    render(<ReviewList reviews={reviews} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Muy rico')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Excelente')).toBeInTheDocument();
  });

  it('renders the correct number of filled and empty stars for the rating', () => {
    render(<ReviewList reviews={[makeReview({ rating: 3 })]} />);

    expect(screen.getByText('★★★☆☆')).toBeInTheDocument();
  });

  it('does not render a comment paragraph when comment is null', () => {
    render(<ReviewList reviews={[makeReview({ comment: null })]} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Muy rico')).not.toBeInTheDocument();
  });
});
