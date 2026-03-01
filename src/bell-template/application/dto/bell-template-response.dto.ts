import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from '@prisma/client';

/** DTO шаблона звонков для документации ответов API */
export class BellTemplateResponseDto {
  @ApiPropertyOptional({ example: 1, description: 'ID шаблона' })
  id: number | null;

  @ApiProperty({ example: 1, description: 'ID учреждения' })
  institutionId: number;

  @ApiPropertyOptional({ example: 1, description: 'ID группы (null = общий шаблон учреждения)', nullable: true })
  groupId: number | null;

  @ApiProperty({ enum: ScheduleType, example: 'weekday', description: 'Тип расписания' })
  scheduleType: ScheduleType;

  @ApiPropertyOptional({ example: '2025-09-01T00:00:00Z', description: 'Конкретная дата (для scheduleType = "date")', nullable: true })
  specificDate: Date | null;

  @ApiPropertyOptional({ example: 1, description: 'Начальный день недели (1=пн, 7=вс, для scheduleType = "weekday")', nullable: true })
  weekdayStart: number | null;

  @ApiPropertyOptional({ example: 5, description: 'Конечный день недели (1=пн, 7=вс, для scheduleType = "weekday")', nullable: true })
  weekdayEnd: number | null;

  @ApiProperty({ example: 1, description: 'Номер урока' })
  lessonNumber: number;

  @ApiProperty({ example: '1970-01-01T09:00:00Z', description: 'Время начала урока' })
  startTime: Date;

  @ApiProperty({ example: '1970-01-01T10:30:00Z', description: 'Время окончания урока' })
  endTime: Date;
}
