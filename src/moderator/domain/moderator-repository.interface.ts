import { Moderator } from './entities/moderator.entity';

export interface FindModeratorOptions {
  includeUser?: boolean;
}

export interface IFindModeratorsByInstitutionParams {
  page?: number;
  limit?: number;
  query?: string;
}

export interface IModeratorRepository {
  create(moderator: Moderator): Promise<Moderator>;
  findByUserId(userId: number, options?: FindModeratorOptions): Promise<Moderator | null>;
  findByInstitutionId(
    institutionId: number,
    params?: IFindModeratorsByInstitutionParams,
  ): Promise<{ moderators: Moderator[]; total: number }>;
  update(userId: number, moderator: Moderator): Promise<Moderator>;
  remove(userId: number): Promise<void>;
}
