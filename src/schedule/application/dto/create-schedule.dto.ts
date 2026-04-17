import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleClassType } from '@prisma/client';

/** Нужен либо bellTemplateId, либо lessonNumber (для авто-подбора шаблона). При добавлении подгруппы (scheduleSlotId) шаблон берётся из слота — проверка не требуется. */
@ValidatorConstraint({ name: 'scheduleTemplateOrLesson', async: false })
export class ScheduleTemplateOrLessonConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as {
      bellTemplateId?: number;
      lessonNumber?: number;
      scheduleSlotId?: string;
    };
    if (obj.scheduleSlotId != null && String(obj.scheduleSlotId).trim() !== '') {
      return true;
    }
    const hasTemplate = obj.bellTemplateId != null && obj.bellTemplateId > 0;
    const hasLesson = obj.lessonNumber != null && obj.lessonNumber >= 1;
    return hasTemplate || hasLesson;
  }
  defaultMessage() {
    return 'Укажите либо bellTemplateId, либо lessonNumber (номер урока для авто-подбора шаблона звонков)';
  }
}

/** DTO создания занятия в расписании */
export class CreateScheduleDto {
  @ApiProperty({ example: 1, description: 'ID предмета' })
  @IsNotEmpty({ message: 'ID предмета обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID предмета должен быть целым числом' })
  @Min(1, { message: 'ID предмета должен быть не меньше 1' })
  subjectId: number;

  @ApiProperty({ example: 1, description: 'ID группы' })
  @IsNotEmpty({ message: 'ID группы обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID группы должен быть целым числом' })
  @Min(1, { message: 'ID группы должен быть не меньше 1' })
  groupId: number;

  @ApiProperty({ example: 1, description: 'ID учителя (Teacher)' })
  @IsNotEmpty({ message: 'ID учителя обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID учителя должен быть целым числом' })
  @Min(1, { message: 'ID учителя должен быть не меньше 1' })
  teacherId: number;

  /** ID аудитории; не указывать или null — занятие проводится удалённо (дистанционно) */
  @ApiPropertyOptional({
    example: 1,
    description: 'ID аудитории. Не указывать или null — занятие удалённое',
  })
  @IsOptional()
  @ValidateIf((o) => o.classroomId != null)
  @Type(() => Number)
  @IsInt({ message: 'ID аудитории должен быть целым числом' })
  @Min(1, { message: 'ID аудитории должен быть не меньше 1' })
  classroomId?: number | null;

  @ApiPropertyOptional({
    enum: ScheduleClassType,
    example: ScheduleClassType.ONLINE,
    description:
      'Тип занятия. ONLINE и DISTANCE проводятся без аудитории (classroomId должен быть null).',
  })
  @IsOptional()
  @IsEnum(ScheduleClassType, { message: 'type может быть только ONLINE, TEST, EXAM или DISTANCE' })
  type?: ScheduleClassType;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID шаблона звонков. Если не указан — подбирается по lessonNumber, группе и дате.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID шаблона звонков должен быть целым числом' })
  @Min(1, { message: 'ID шаблона звонков должен быть не меньше 1' })
  bellTemplateId?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Номер урока (1, 2, 3…). Используется для авто-подбора шаблона звонков, если bellTemplateId не указан.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Номер урока должен быть целым числом' })
  @Min(1, { message: 'Номер урока должен быть не меньше 1' })
  lessonNumber?: number;

  @ApiProperty({
    example: '2025-03-05T00:00:00.000Z',
    description: 'Дата занятия (ISO 8601)',
  })
  @IsNotEmpty({ message: 'Дата занятия обязательна' })
  @IsDateString({}, { message: 'Укажите дату в формате ISO (например, 2025-03-05)' })
  scheduleDate: string;

  /** При добавлении подгруппы: ID слота существующего занятия (UUID). Не передавать при создании первого занятия слота. */
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'ID слота занятия. Если указан — создаётся подгруппа к существующему занятию (те же предмет, группа, дата, звонки; другой преподаватель/аудитория).',
  })
  @IsOptional()
  @IsString({ message: 'ID слота должен быть строкой' })
  @IsUUID('4', { message: 'Некорректный формат ID слота (ожидается UUID)' })
  scheduleSlotId?: string;

  @Validate(ScheduleTemplateOrLessonConstraint)
  _templateOrLesson?: unknown;
}
