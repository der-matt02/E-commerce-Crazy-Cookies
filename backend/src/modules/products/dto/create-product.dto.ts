import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Galletas de Chocolate', description: 'Nombre del producto' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'galletas-chocolate', description: 'Slug único para URLs' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  slug!: string;

  @ApiProperty({ example: 'Deliciosas galletas con chips de chocolate', description: 'Descripción del producto' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: 15000, description: 'Precio del producto en pesos' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'uuid-de-categoria', description: 'ID de la categoría' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Si el producto está activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 50, description: 'Stock disponible inicial' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stockAvailable?: number;

  @ApiPropertyOptional({ example: 10, description: 'Stock mínimo' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stockMinimum?: number;
}
