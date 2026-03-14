import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/** Query DTO для GET /student — список студентов группы (groupId обязателен) */
export class GetStudentsQueryDto {
  @ApiProperty({ example: 1, description: 'ID группы' })
  @IsNotEmpty({ message: 'Параметр groupId обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'groupId должен быть числом' })
  @Min(1, { message: 'groupId должен быть положительным' })
  groupId: number;

  @ApiPropertyOptional({ description: 'Включить связанные сущности', example: 'user' })
  @IsOptional()
  @IsString()
  include?: string;
}
