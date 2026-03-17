import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}

/** Тип для обновления пользователя с возможностью сброса отчества (null). Используется в update(). */
export type UpdateUserDtoLike = Omit<UpdateUserDto, 'patronymic'> & {
  patronymic?: string | null;
};
