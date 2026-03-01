import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

/** DTO назначения куратора группы */
export class AssignTeacherDto {
  @ApiProperty({ example: 1, description: 'ID пользователя-преподавателя (куратора)' })
  @IsInt()
  @IsPositive({ message: 'userId преподавателя должен быть положительным' })
  teacherUserId: number;
}