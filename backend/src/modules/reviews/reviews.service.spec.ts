import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create review successfully', async () => {
      const productId = 'product-1';
      const dto = {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        rating: 5,
        comment: 'Great product!',
      };

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: productId,
        isActive: true,
      });

      mockPrismaService.review.create.mockResolvedValue({
        id: 'review-1',
        productId,
        ...dto,
        isApproved: false,
      });

      const result = await service.create(productId, dto);

      expect(result).toBeDefined();
      expect(result.isApproved).toBe(false);
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          productId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should throw error when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-id', {
          customerName: 'Test',
          customerEmail: 'test@test.com',
          rating: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when product is inactive', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: false,
      });

      await expect(
        service.create('product-1', {
          customerName: 'Test',
          customerEmail: 'test@test.com',
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getByProduct', () => {
    it('should return only approved reviews by default', async () => {
      const productId = 'product-1';
      const mockReviews = [
        { id: 'review-1', productId, isApproved: true },
        { id: 'review-2', productId, isApproved: true },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.getByProduct(productId);

      expect(result).toEqual(mockReviews);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { productId, isApproved: true },
        include: { images: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return all reviews when includeUnapproved is true', async () => {
      const productId = 'product-1';

      mockPrismaService.review.findMany.mockResolvedValue([]);

      await service.getByProduct(productId, true);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { productId },
        include: { images: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('approve', () => {
    it('should approve review successfully', async () => {
      const reviewId = 'review-1';
      const adminId = 'admin-1';

      mockPrismaService.review.findUnique.mockResolvedValue({
        id: reviewId,
        isApproved: false,
      });

      mockPrismaService.review.update.mockResolvedValue({
        id: reviewId,
        isApproved: true,
        approvedBy: adminId,
        approvedAt: new Date(),
      });

      const result = await service.approve(reviewId, { isApproved: true }, adminId);

      expect(result).toBeDefined();
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: {
          isApproved: true,
          approvedBy: adminId,
          approvedAt: expect.any(Date),
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should reject review (set isApproved to false)', async () => {
      const reviewId = 'review-1';

      mockPrismaService.review.findUnique.mockResolvedValue({
        id: reviewId,
        isApproved: true,
      });

      mockPrismaService.review.update.mockResolvedValue({
        id: reviewId,
        isApproved: false,
        approvedAt: null,
      });

      await service.approve(reviewId, { isApproved: false });

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: {
          isApproved: false,
          approvedBy: undefined,
          approvedAt: null,
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should throw error when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.approve('invalid-id', { isApproved: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductRatingStats', () => {
    it('should calculate rating stats correctly', async () => {
      const productId = 'product-1';
      const mockReviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 5 },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.getProductRatingStats(productId);

      expect(result).toEqual({
        average: 4.4,
        count: 5,
        distribution: {
          1: 0,
          2: 0,
          3: 1,
          4: 1,
          5: 3,
        },
      });
    });

    it('should return zero stats when no reviews', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.getProductRatingStats('product-1');

      expect(result).toEqual({
        average: 0,
        count: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete review successfully', async () => {
      const reviewId = 'review-1';

      mockPrismaService.review.findUnique.mockResolvedValue({
        id: reviewId,
      });

      mockPrismaService.review.delete.mockResolvedValue({});

      const result = await service.delete(reviewId);

      expect(result).toEqual({ message: 'Review eliminada correctamente' });
      expect(mockPrismaService.review.delete).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
    });

    it('should throw error when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
