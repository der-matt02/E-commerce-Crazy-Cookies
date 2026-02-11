import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, description: 'Nueva cantidad', minimum: 1, maximum: 99 })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(99)
  quantity!: number;
}
