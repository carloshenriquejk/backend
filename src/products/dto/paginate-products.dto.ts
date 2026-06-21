import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PaginateProductsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;
}
