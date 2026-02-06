import { IsOptional, IsString } from 'class-validator';

export class GetMeDto {
  @IsOptional()
  @IsString()
  include?: string;
}
