import { Moderator } from './entities/moderator.entity';

export interface FindModeratorOptions {
  includeUser?: boolean;
}

export interface IModeratorRepository {
  create(moderator: Moderator): Promise<Moderator>;
  findByUserId(userId: number, options?: FindModeratorOptions): Promise<Moderator | null>;
  update(userId: number, moderator: Moderator): Promise<Moderator>;
  remove(userId: number): Promise<void>;
}
