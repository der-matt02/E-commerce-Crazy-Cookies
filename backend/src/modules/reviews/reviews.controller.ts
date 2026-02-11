import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ApproveReviewDto } from './dto/approve-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('products/:productId')
  async createReview(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(productId, dto);
  }

  @Get('products/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('includeUnapproved') includeUnapproved?: string,
  ) {
    const include = includeUnapproved === 'true';
    return this.reviewsService.getByProduct(productId, include);
  }

  @Get('products/:productId/stats')
  async getProductRatingStats(@Param('productId') productId: string) {
    return this.reviewsService.getProductRatingStats(productId);
  }

  @Get('pending')
  async getPendingReviews() {
    return this.reviewsService.getPending();
  }

  @Get()
  async getAllReviews(@Query('approved') approved?: string) {
    const isApproved =
      approved === 'true' ? true : approved === 'false' ? false : undefined;
    return this.reviewsService.getAll(isApproved);
  }

  @Patch(':id/approve')
  async approveReview(
    @Param('id') id: string,
    @Body() dto: ApproveReviewDto,
  ) {
    return this.reviewsService.approve(id, dto);
  }

  @Delete(':id')
  async deleteReview(@Param('id') id: string) {
    return this.reviewsService.delete(id);
  }
}
