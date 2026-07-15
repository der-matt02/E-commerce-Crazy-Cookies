import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ApproveReviewDto } from './dto/approve-review.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReviewsController', () => {
  let controller: ReviewsController;

  const mockReviewsService = {
    create: jest.fn(),
    getByProduct: jest.fn(),
    getProductRatingStats: jest.fn(),
    getPending: jest.fn(),
    getAll: jest.fn(),
    approve: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
        // JwtAuthGuard is used via @UseGuards() on some routes; Nest auto-registers it as an
        // injectable in the testing module, so its own dependency (ConfigService) must be
        // resolvable even though we never invoke the guard directly in these unit tests.
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('should protect getPendingReviews with JwtAuthGuard', () => {
      const guards =
        Reflect.getMetadata('__guards__', ReviewsController.prototype.getPendingReviews) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect approveReview with JwtAuthGuard', () => {
      const guards =
        Reflect.getMetadata('__guards__', ReviewsController.prototype.approveReview) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect deleteReview with JwtAuthGuard', () => {
      const guards =
        Reflect.getMetadata('__guards__', ReviewsController.prototype.deleteReview) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should NOT protect createReview, getProductReviews, getProductRatingStats or getAllReviews (public endpoints)', () => {
      expect(
        Reflect.getMetadata('__guards__', ReviewsController.prototype.createReview),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata('__guards__', ReviewsController.prototype.getProductReviews),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata('__guards__', ReviewsController.prototype.getProductRatingStats),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata('__guards__', ReviewsController.prototype.getAllReviews),
      ).toBeUndefined();
    });
  });

  describe('createReview', () => {
    it('should delegate to ReviewsService.create with productId and dto', async () => {
      const dto: CreateReviewDto = {
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        rating: 5,
        comment: 'Excelente',
      };
      const mockReview = { id: 'review-1', ...dto };
      mockReviewsService.create.mockResolvedValue(mockReview);

      const result = await controller.createReview('product-1', dto);

      expect(mockReviewsService.create).toHaveBeenCalledWith('product-1', dto);
      expect(result).toEqual(mockReview);
    });

    it('should propagate NotFoundException when the product does not exist', async () => {
      const dto: CreateReviewDto = {
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        rating: 5,
      };
      mockReviewsService.create.mockRejectedValue(new NotFoundException('Producto no encontrado'));

      await expect(controller.createReview('non-existent', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductReviews', () => {
    it('should delegate to ReviewsService.getByProduct with includeUnapproved=true when query param is "true"', async () => {
      mockReviewsService.getByProduct.mockResolvedValue([]);

      await controller.getProductReviews('product-1', 'true');

      expect(mockReviewsService.getByProduct).toHaveBeenCalledWith('product-1', true);
    });

    it('should default includeUnapproved to false when query param is absent', async () => {
      mockReviewsService.getByProduct.mockResolvedValue([]);

      await controller.getProductReviews('product-1', undefined);

      expect(mockReviewsService.getByProduct).toHaveBeenCalledWith('product-1', false);
    });

    it('should treat any non-"true" value as false (edge case)', async () => {
      mockReviewsService.getByProduct.mockResolvedValue([]);

      await controller.getProductReviews('product-1', 'yes');

      expect(mockReviewsService.getByProduct).toHaveBeenCalledWith('product-1', false);
    });
  });

  describe('getProductRatingStats', () => {
    it('should delegate to ReviewsService.getProductRatingStats with productId', async () => {
      const mockStats = { average: 4.5, total: 10 };
      mockReviewsService.getProductRatingStats.mockResolvedValue(mockStats);

      const result = await controller.getProductRatingStats('product-1');

      expect(mockReviewsService.getProductRatingStats).toHaveBeenCalledWith('product-1');
      expect(result).toEqual(mockStats);
    });

    it('should propagate errors for a malformed productId', async () => {
      mockReviewsService.getProductRatingStats.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );

      await expect(controller.getProductRatingStats('###bad-id###')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPendingReviews', () => {
    it('should delegate to ReviewsService.getPending', async () => {
      mockReviewsService.getPending.mockResolvedValue([{ id: 'review-1', isApproved: false }]);

      const result = await controller.getPendingReviews();

      expect(mockReviewsService.getPending).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 'review-1', isApproved: false }]);
    });
  });

  describe('getAllReviews', () => {
    it('should map approved="true" query param to boolean true', async () => {
      mockReviewsService.getAll.mockResolvedValue([]);

      await controller.getAllReviews('true');

      expect(mockReviewsService.getAll).toHaveBeenCalledWith(true);
    });

    it('should map approved="false" query param to boolean false', async () => {
      mockReviewsService.getAll.mockResolvedValue([]);

      await controller.getAllReviews('false');

      expect(mockReviewsService.getAll).toHaveBeenCalledWith(false);
    });

    it('should map an absent/other approved query param to undefined', async () => {
      mockReviewsService.getAll.mockResolvedValue([]);

      await controller.getAllReviews(undefined);

      expect(mockReviewsService.getAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('approveReview', () => {
    it('should delegate to ReviewsService.approve with id and dto', async () => {
      const dto: ApproveReviewDto = { isApproved: true };
      const mockReview = { id: 'review-1', isApproved: true };
      mockReviewsService.approve.mockResolvedValue(mockReview);

      const result = await controller.approveReview('review-1', dto);

      expect(mockReviewsService.approve).toHaveBeenCalledWith('review-1', dto);
      expect(result).toEqual(mockReview);
    });

    it('should propagate NotFoundException when the review does not exist', async () => {
      const dto: ApproveReviewDto = { isApproved: true };
      mockReviewsService.approve.mockRejectedValue(new NotFoundException('Reseña no encontrada'));

      await expect(controller.approveReview('unknown-id', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteReview', () => {
    it('should delegate to ReviewsService.delete with id', async () => {
      mockReviewsService.delete.mockResolvedValue({ id: 'review-1' });

      const result = await controller.deleteReview('review-1');

      expect(mockReviewsService.delete).toHaveBeenCalledWith('review-1');
      expect(result).toEqual({ id: 'review-1' });
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      mockReviewsService.delete.mockRejectedValue(new BadRequestException('No se puede eliminar'));

      await expect(controller.deleteReview('review-1')).rejects.toThrow(BadRequestException);
    });
  });
});
