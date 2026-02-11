import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ example: 'uuid-del-producto', description: 'ID del producto' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2, description: 'Cantidad a agregar', minimum: 1, maximum: 99 })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(99)
  quantity!: number;
}
