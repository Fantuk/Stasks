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

  @ApiProperty({ example: 1, description: 'ID аудитории' })
  classroomId: number;

  @ApiProperty({ example: 1, description: 'ID шаблона звонков' })
  bellTemplateId: number;

  @ApiProperty({ description: 'Дата занятия' })
  scheduleDate: Date;

  @ApiPropertyOptional({
    type: BellTemplateSlotDto,
    description: 'Шаблон звонков (время слота), если запрошено include',
  })
  bellTemplate?: BellTemplateSlotDto;
}
