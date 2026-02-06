import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty({ message: 'Название предмета обязательно' })
  @IsString()
  @Length(2, 100, { message: 'Название от 2 до 100 символов' })
  name: string;
}