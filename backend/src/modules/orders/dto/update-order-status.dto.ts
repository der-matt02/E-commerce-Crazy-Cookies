import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'Nuevo estado de la orden' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ example: 'Pedido despachado por mensajería', description: 'Nota sobre el cambio' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
