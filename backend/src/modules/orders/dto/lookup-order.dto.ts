import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LookupOrderDto {
  @ApiProperty({ example: 'ORD-1234567890-AB12', description: 'Número de orden' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: '3001234567', description: 'Teléfono usado en la compra' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  customerPhone!: string;
}
