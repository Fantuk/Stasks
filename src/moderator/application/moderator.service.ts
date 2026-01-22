import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { IModeratorRepository } from 'src/moderator/domain/moderator-repository.interface';
import {
  IModeratorAccessRights,
  Moderator,
} from 'src/moderator/domain/entities/moderator.entity';
import { ICreateModeratorParams } from './interfaces/interfaces';
import { UserService } from 'src/user/application/user.service';

@Injectable()
export class ModeratorService {
  private readonly logger = new Logger(ModeratorService.name);
  constructor(
    @Inject('ModeratorRepository')
    private readonly moderatorRepository: IModeratorRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) { }

  async create(moderator: ICreateModeratorParams): Promise<Moderator> {
    const user = await this.userService.findById(moderator.userId);
    if (!user) {
      throw new NotFoundException(
        'Пользователь не найден по id ' + moderator.userId,
      );
    }

    const existingModerator = await this.findByUserId(moderator.userId);
    if (existingModerator) {
      throw new ConflictException('Модератор с таким id уже существует');
    }

    this.logger.log(`Создание модератора ${moderator.userId}`);
    const createdModerator = Moderator.create(moderator);
    return this.moderatorRepository.create(createdModerator);
  }

  async findByUserId(
    userId: number,
    institutionId?: number,
    includeUser?: boolean,
  ): Promise<Moderator | null> {
    const moderator = this.moderatorRepository.findByUserId(userId, {
      includeUser: includeUser ?? false,
    });

    if (!moderator) {
      return null;
    }

    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к модератору из другого учреждения',
        );
      }
    }
    return moderator;
  }

  async updateAccessRights(
    userId: number,
    accessRights: Partial<IModeratorAccessRights>,
    institutionId?: number,
  ) {
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к модератору из другого учреждения',
        );
      }
    }

    const moderator = await this.moderatorRepository.findByUserId(userId);
    if (!moderator) {
      throw new NotFoundException('Модератор не найден по id ' + userId);
    }
    this.logger.log(
      `Обновление прав модератора ${userId} на ${JSON.stringify(accessRights)}`,
    );
    moderator.updateAccessRights(accessRights);
    return this.moderatorRepository.update(userId, moderator);
  }

  async checkPermission(
    userId: number,
    permission: keyof IModeratorAccessRights,
    institutionId?: number,
  ) {
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к модератору из другого учреждения',
        );
      }
    }

    const moderator = await this.moderatorRepository.findByUserId(userId);
    if (!moderator) {
      return false;
    }
    return moderator.hasPermission(permission);
  }

  async remove(userId: number): Promise<void> {
    const moderator = await this.moderatorRepository.findByUserId(userId);
    if (!moderator) {
      this.logger.warn('Модератор не найден по id ' + userId);
      return;
    }

    return this.moderatorRepository.remove(userId);
  }
}
