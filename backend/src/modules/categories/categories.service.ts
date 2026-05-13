import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if slug already exists
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Category with slug "${createCategoryDto.slug}" already exists`);
    }

    // Check if name already exists
    const existingName = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existingName) {
      throw new ConflictException(`Category with name "${createCategoryDto.name}" already exists`);
    }

    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    await this.findOne(id);

    // Check if slug is being updated and if it's already taken
    if (updateCategoryDto.slug) {
      const existingSlug = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(
          `Category with slug "${updateCategoryDto.slug}" already exists`,
        );
      }
    }

    // Check if name is being updated and if it's already taken
    if (updateCategoryDto.name) {
      const existingName = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string) {
    // Check if category exists
    await this.findOne(id);

    // Check if category has products
    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${productsCount} product(s). Please reassign or delete products first.`,
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
