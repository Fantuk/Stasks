import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { MODERATOR_PERMISSIONS_KEY } from 'src/common/decorators/moderator-permissions.decorator';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { ModeratorService } from 'src/moderator/application/moderator.service';
import { IModeratorAccessRights } from 'src/moderator/domain/entities/moderator.entity';

@Injectable()
export class ModeratorPermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private moderatorService: ModeratorService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const requiredPermissions = this.reflector.getAllAndOverride<Array<keyof IModeratorAccessRights>>(MODERATOR_PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user) {
            throw new UnauthorizedException('Пользователь не авторизован');
        }

        if (user.roles.includes(Role.ADMIN)) {
            return true;
        }

        if (!user.roles.includes(Role.MODERATOR)) {
            throw new ForbiddenException('Недостаточно прав');
        }

        const hasAllPermisions = await Promise.all(
            requiredPermissions.map((permission) =>
                this.moderatorService.checkPermission(user.userId, permission, user.institutionId)
            )
        )

        const hasPermission = hasAllPermisions.every((has) => has === true);

        if (!hasPermission) {
            throw new ForbiddenException('Недостаточно прав');
        }

        return true;
    }
}