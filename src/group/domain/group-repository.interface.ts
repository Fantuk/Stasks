import { Group } from 'src/group/domain/entities/group.entity';

export interface ISearchGroupsParams {
  institutionId: number;
  query?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Краткие данные куратора для списка групп */
export interface MentorSummary {
  id: number;
  userId: number;
  displayName: string;
}

/** Элемент списка группы с количеством студентов и куратором (для списка/поиска). */
export interface GroupWithStudentCount {
  group: Group;
  studentCount: number;
  mentor?: MentorSummary;
}

export interface IGroupRepository {
  create(data: Omit<Group, 'id' | 'toPersistance' | 'toResponse'>): Promise<Group>;
  findById(id: number): Promise<Group | null>;
  findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
    sort?: string,
    order?: 'asc' | 'desc',
  ): Promise<{ groups: GroupWithStudentCount[]; total: number }>;
  findByName(name: string, institutionId: number): Promise<Group | null>;
  findBySubjectId(subjectId: number, institutionId?: number): Promise<Group[]>;
  search(params: ISearchGroupsParams): Promise<{ groups: GroupWithStudentCount[]; total: number }>;
  update(id: number, data: Partial<Omit<Group, 'id'>>): Promise<Group>;
  remove(id: number): Promise<void>;
}
