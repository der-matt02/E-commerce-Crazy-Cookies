import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const emptyToUndefined = ({ value }: { value: string }) => (value === '' ? undefined : value);

export class CreateOrderDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del cliente' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  customerName!: string;

  @ApiProperty({ example: '3001234567', description: 'Teléfono del cliente' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  customerPhone!: string;

  @ApiPropertyOptional({ example: 'juan@example.com', description: 'Email del cliente' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ example: 'Calle 123 #45-67, Bogotá', description: 'Dirección de entrega' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  deliveryAddress!: string;

  @ApiPropertyOptional({ example: 'Apto 301, llamar al timbre', description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'VERANO10', description: 'Código de cupón de descuento' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  couponCode?: string;
}
