import { Role } from '@prisma/client';
import { User } from './entities/user.entity';

export interface ISearchUsersParams {
  institutionId: number;
  query?: string;
  roles?: Role[];
  page?: number;
  limit?: number
}

export interface IUserRepository {
  create(
    data: Omit<User, 'id' | 'toPersistence' | 'toResponse'>,
  ): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ): Promise<{ users: User[]; total: number }>;
  search(params: ISearchUsersParams): Promise<{ users: User[], total: number }>
  update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User>;
  remove(id: number): Promise<void>;
}
