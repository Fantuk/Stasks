import { Student } from './entities/student.entity';

export interface FindStudentOptions {
  includeUser?: boolean;
}

export interface IStudentRepository {
  create(student: Student): Promise<Student>;
  findByUserId(userId: number, options?: FindStudentOptions): Promise<Student | null>;
  findByGroupId(groupId: number, options?: FindStudentOptions): Promise<Student[]>;
  update(userId: number, student: Student): Promise<Student>;
  remove(userId: number): Promise<void>;
}
