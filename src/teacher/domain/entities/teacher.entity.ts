import { User } from 'src/user/domain/entities/user.entity';
import type { Prisma } from '@prisma/client';
import { UserResponse } from 'src/user/application/interfaces/interfaces';

export interface ITeacherResponse {
  id: number | null;
  userId: number;
  mentoredGroupId: number | null;
  user?: UserResponse;
}

export class Teacher {
  private constructor(
    public readonly id: number | null,
    public readonly userId: number,
    private mentoredGroupId: number | null,
    private _user?: User,
  ) { }

  setUserData(userData: Prisma.UserGetPayload<{}>): void {
    this._user = User.fromPersistence({
      id: userData.id,
      institutionId: userData.institutionId,
      name: userData.name,
      surname: userData.surname,
      patronymic: userData.patronymic,
      email: userData.email,
      password: userData.password,
      roles: userData.roles,
      isActivated: userData.isActivated,
    });
  }

  getUser(): User | undefined {
    return this._user ?? undefined;
  }

  static create(params: {
    userId: number;
    mentoredGroupId: number | null;
  }): Teacher {
    return new Teacher(null, params.userId, params.mentoredGroupId);
  }

  static fromPersistence(raw: {
    id: number;
    userId: number;
    mentoredGroupId: number | null;
  }): Teacher {
    return new Teacher(raw.id, raw.userId, raw.mentoredGroupId);
  }

  assignMentoredGroup(groupId: number): void {
    this.mentoredGroupId = groupId;
  }

  removeMentoredGroup(): void {
    this.mentoredGroupId = null;
  }

  hasMentoredGroup(): boolean {
    return this.mentoredGroupId !== null;
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      userId: this.userId,
      mentoredGroupId: this.mentoredGroupId,
    };
  }

  toResponse(includeUser: boolean = false) {
    const response: ITeacherResponse = {
      id: this.id,
      userId: this.userId,
      mentoredGroupId: this.mentoredGroupId,
    };

    if (includeUser && this._user) {
      response.user = this._user.toResponse();
    }

    return response;
  }
}
