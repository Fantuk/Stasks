import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Query DTO для GET /users/me */
export class GetMeDto {
  @ApiPropertyOptional({ description: 'Включить связанные сущности', example: 'roles' })
  @IsOptional()
  @IsString()
  include?: string;
}
