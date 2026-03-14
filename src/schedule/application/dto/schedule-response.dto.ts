import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Время слота из шаблона звонков (для ответа) */
export class BellTemplateSlotDto {
  @ApiProperty({ example: 1, description: 'ID шаблона' })
  id: number;

  @ApiProperty({ example: 1, description: 'Номер урока' })
  lessonNumber: number;

  @ApiProperty({ description: 'Время начала' })
  startTime: Date;

  @ApiProperty({ description: 'Время окончания' })
  endTime: Date;

  @ApiPropertyOptional({ description: 'Необязательное время начала второго сегмента' })
  secondStartTime?: Date | null;

  @ApiPropertyOptional({ description: 'Необязательное время окончания второго сегмента' })
  secondEndTime?: Date | null;
}

/** Вложенный предмет (при expand=subject) */
export class ScheduleExpandedSubjectDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

/** Вложенная группа (при expand=group) */
export class ScheduleExpandedGroupDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

/** Вложенный учитель (при expand=teacher) */
export class ScheduleExpandedTeacherDto {
  @ApiProperty() id: number;
  @ApiProperty() userId: number;
  @ApiPropertyOptional() name?: string;
}

/** Вложенный корпус (в составе аудитории в расписании) */
export class ScheduleExpandedBuildingDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

/** Вложенная аудитория (при expand=classroom) */
export class ScheduleExpandedClassroomDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional({
    type: ScheduleExpandedBuildingDto,
    description: 'Корпус (здание) аудитории',
  })
  building?: ScheduleExpandedBuildingDto;
}

/** DTO занятия в ответе API (базовые поля) */
export class ScheduleResponseDto {
  @ApiProperty({ example: 1, description: 'ID занятия' })
  id: number | null;

  @ApiProperty({ example: 1, description: 'ID учреждения' })
  institutionId: number;

  @ApiProperty({ example: 1, description: 'ID предмета' })
  subjectId: number;

  @ApiProperty({ example: 1, description: 'ID группы' })
  groupId: number;

  @ApiProperty({ example: 1, description: 'ID учителя' })
  teacherId: number;

  @ApiPropertyOptional({ example: 1, description: 'ID аудитории (null, если аудитория удалена)' })
  classroomId: number | null;

  @ApiProperty({ example: 1, description: 'ID шаблона звонков' })
  bellTemplateId: number;

  @ApiProperty({ description: 'Дата занятия' })
  scheduleDate: Date;

  /** Слот занятия: записи с одним scheduleSlotId — одно занятие (подгруппы); null у старых записей */
  @ApiPropertyOptional({
    description: 'ID слота занятия (UUID). Одинаковый у всех подгрупп одного занятия.',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  scheduleSlotId?: string | null;

  @ApiPropertyOptional({
    type: BellTemplateSlotDto,
    description: 'Шаблон звонков (время слота), если запрошено include',
  })
  bellTemplate?: BellTemplateSlotDto;

  @ApiPropertyOptional({
    type: ScheduleExpandedSubjectDto,
    description: 'Предмет (при expand=subject)',
  })
  subject?: ScheduleExpandedSubjectDto;

  @ApiPropertyOptional({ type: ScheduleExpandedGroupDto, description: 'Группа (при expand=group)' })
  group?: ScheduleExpandedGroupDto;

  @ApiPropertyOptional({
    type: ScheduleExpandedTeacherDto,
    description: 'Учитель (при expand=teacher)',
  })
  teacher?: ScheduleExpandedTeacherDto;

  @ApiPropertyOptional({
    type: ScheduleExpandedClassroomDto,
    description: 'Аудитория (при expand=classroom)',
  })
  classroom?: ScheduleExpandedClassroomDto;
}
