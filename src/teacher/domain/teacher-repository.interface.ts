import { Teacher } from './entities/teacher.entity';

export interface FindTeacherOptions {
  includeUser?: boolean;
}

export interface ITeacherRepository {
  create(teacher: Teacher): Promise<Teacher>;
  findByUserId(userId: number, options?: FindTeacherOptions): Promise<Teacher | null>;
  findByMentoredGroupId(groupId: number, options?: FindTeacherOptions): Promise<Teacher | null>;
  update(userId: number, teacher: Teacher): Promise<Teacher>;
  remove(userId: number): Promise<void>;
}
