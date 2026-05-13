import {
  IsString,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
