import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsDateString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO обновления занятия в расписании (все поля опциональны) */
export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 1, description: 'ID предмета' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID группы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  groupId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID учителя' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId?: number;

  /** ID аудитории; null — занятие проводится удалённо (дистанционно) */
  @ApiPropertyOptional({ example: 1, description: 'ID аудитории. null — занятие удалённое' })
  @IsOptional()
  @ValidateIf((o) => o.classroomId != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classroomId?: number | null;

  @ApiPropertyOptional({ example: 1, description: 'ID шаблона звонков' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bellTemplateId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Номер урока для авто-подбора шаблона (если bellTemplateId не указан)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lessonNumber?: number;

  @ApiPropertyOptional({
    example: '2025-03-05T00:00:00.000Z',
    description: 'Дата занятия (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  scheduleDate?: string;
}
