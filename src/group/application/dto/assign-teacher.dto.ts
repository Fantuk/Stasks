import { IsInt, IsPositive } from 'class-validator';

export class AssignTeacherDto {
  @IsInt()
  @IsPositive({ message: 'userId преподавателя должен быть положительным' })
  teacherUserId: number;
}