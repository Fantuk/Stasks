import { Teacher } from './entities/teacher.entity';

export interface FindTeacherOptions {
  includeUser?: boolean;
}

export interface IFindTeachersByInstitutionParams {
  page?: number;
  limit?: number;
  query?: string;
}

export interface ITeacherRepository {
  create(teacher: Teacher): Promise<Teacher>;
  findById(id: number, options?: FindTeacherOptions): Promise<Teacher | null>;
  findByUserId(userId: number, options?: FindTeacherOptions): Promise<Teacher | null>;
  findByMentoredGroupId(groupId: number, options?: FindTeacherOptions): Promise<Teacher | null>;
  findBySubjectId(
    subjectId: number,
    options?: FindTeacherOptions,
    institutionId?: number,
  ): Promise<Teacher[]>;
  findByInstitutionId(
    institutionId: number,
    params?: IFindTeachersByInstitutionParams,
  ): Promise<{ teachers: Teacher[]; total: number }>;
  update(userId: number, teacher: Teacher): Promise<Teacher>;
  remove(userId: number): Promise<void>;
}
