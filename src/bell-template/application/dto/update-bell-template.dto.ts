import { PartialType } from '@nestjs/mapped-types';
import { CreateBellTemplateDto } from './create-bell-template.dto';

/** DTO обновления шаблона звонков (все поля опциональны) */
export class UpdateBellTemplateDto extends PartialType(CreateBellTemplateDto) {}
