import { Subject } from 'src/subject/domain/entities/subject.entity';

export interface ISearchSubjectsParams {
  institutionId: number;
  query?: string;
  page?: number;
  limit?: number;
}

export interface ISubjectRepository {
  create(data: Omit<Subject, 'id' | 'toPersistence' | 'toResponse'>): Promise<Subject>;
  findById(id: number): Promise<Subject | null>;
  findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ): Promise<{ subjects: Subject[]; total: number }>;
  findByName(name: string, institutionId: number): Promise<Subject | null>;
  /** Предметы, привязанные к группе (для расписания по группе). */
  findByGroupId(groupId: number, institutionId: number): Promise<Subject[]>;
  update(id: number, data: Partial<Omit<Subject, 'id'>>): Promise<Subject>;
  remove(id: number): Promise<void>;

  search(params: ISearchSubjectsParams): Promise<{ subjects: Subject[]; total: number }>;
  findExistingGroupsBySubject(subjectId: number, groupIds: number[]): Promise<{ name: string }[]>;
  findExistingTeachersBySubject(
    subjectId: number,
    teacherIds: number[],
  ): Promise<{ name: string }[]>;

  assignTeachers(subjectId: number, teacherIds: number[]): Promise<void>;
  unassignTeacher(subjectId: number, teacherId: number): Promise<void>;
  assignGroups(subjectId: number, groupIds: number[]): Promise<void>;
  unassignGroup(subjectId: number, groupId: number): Promise<void>;
}
