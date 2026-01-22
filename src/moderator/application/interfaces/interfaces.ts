import { IModeratorAccessRights } from 'src/moderator/domain/entities/moderator.entity';

export interface ICreateModeratorParams {
  userId: number;
  accessRights?: IModeratorAccessRights;
}
