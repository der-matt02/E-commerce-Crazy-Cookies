import { IsInt, IsString, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AdjustmentType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class AdjustInventoryDto {
  @ApiProperty({ example: 10, description: 'Cantidad a ajustar' })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  quantity!: number;

  @ApiProperty({
    enum: AdjustmentType,
    example: AdjustmentType.IN,
    description: 'Tipo de ajuste',
  })
  @IsEnum(AdjustmentType)
  type!: AdjustmentType;

  @ApiPropertyOptional({ example: 'Entrada de mercancía', description: 'Razón del ajuste' })
  @IsOptional()
  @IsString()
  reason?: string;
}
