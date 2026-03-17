import { SetMetadata } from '@nestjs/common';
import { IModeratorAccessRights } from 'src/moderator/domain/entities/moderator.entity';

export const MODERATOR_PERMISSIONS_KEY = 'moderatorPermissions';

export const ModeratorPermissions = (...permissions: Array<keyof IModeratorAccessRights>) =>
  SetMetadata(MODERATOR_PERMISSIONS_KEY, permissions);
