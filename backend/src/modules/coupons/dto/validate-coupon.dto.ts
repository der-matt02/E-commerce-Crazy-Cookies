import { IsString, IsNumber, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'VERANO10' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ example: 45000, description: 'Subtotal del carrito' })
  @IsNumber()
  @Min(0)
  subtotal!: number;
}
