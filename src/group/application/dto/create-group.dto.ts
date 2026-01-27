import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateGroupDto {
    @IsNotEmpty({ message: 'Название группы обязательно' })
    @IsString({ message: 'Название должно быть строкой' })
    @Length(2, 50, { message: 'Название должно быть от 2 до 50 символов' })
    name: string;
}