import { User } from './entities/user.entity';
import { Role } from '@prisma/client';
import { Student } from 'src/student/domain/entities/student.entity';
import { Teacher } from 'src/teacher/domain/entities/teacher.entity';
import { Moderator } from 'src/moderator/domain/entities/moderator.entity';
import { IFindUserOptions } from 'src/common/interfaces/find-options.interface';

export interface ISearchUsersParams {
  institutionId: number;
  query?: string;
  roles?: Role[];
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  include?: IFindUserOptions;
}

export interface IUserWithProfiles {
  user: User;
  student?: Student;
  teacher?: Teacher;
  moderator?: Moderator;
}

export interface IUserRepository {
  create(data: Omit<User, 'id' | 'toPersistence' | 'toResponse'>): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findById(id: number, options?: IFindUserOptions): Promise<IUserWithProfiles | null>;
  findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
    options?: IFindUserOptions,
    sort?: string,
    order?: 'asc' | 'desc',
  ): Promise<{ users: IUserWithProfiles[]; total: number }>;
  search(params: ISearchUsersParams): Promise<{ users: IUserWithProfiles[]; total: number }>;
  update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User>;
  remove(id: number): Promise<void>;
}
