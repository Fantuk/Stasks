import { User } from "src/user/domain/entities/user.entity";
import { Prisma } from "@prisma/client";
import { UserResponse } from "src/user/application/interfaces/interfaces";

export interface IModeratorAccessRights {
  [key: string]: boolean | undefined;
  canDeleteUsers?: boolean;
  canRegisterUsers?: boolean;
}

export interface IModeratorResponse {
  id: number | null;
  userId: number;
  accessRights: IModeratorAccessRights;
  user?: UserResponse;
}

export class Moderator {
  private constructor(
    public readonly id: number | null,
    public readonly userId: number,
    public accessRights: IModeratorAccessRights,
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
    accessRights?: IModeratorAccessRights;
  }): Moderator {
    return new Moderator(null, params.userId, params.accessRights || {});
  }

  static fromPersistence(raw: {
    id: number;
    userId: number;
    accessRights: IModeratorAccessRights | null;
  }): Moderator {
    return new Moderator(raw.id, raw.userId, raw.accessRights ?? {});
  }

  updateAccessRights(accessRights: Partial<IModeratorAccessRights>): void {
    this.accessRights = {
      ...this.accessRights,
      ...accessRights,
    };
  }

  hasPermission(permission: keyof IModeratorAccessRights): boolean {
    return this.accessRights[permission] === true;
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      userId: this.userId,
      accessRights: this.accessRights,
    };
  }

  toResponse(includeUser: boolean = false) {
    const response: IModeratorResponse = {
      id: this.id,
      userId: this.userId,
      accessRights: this.accessRights,
    };

    if (includeUser && this._user) {
      response.user = this._user.toResponse();
    }

    return response;
  }
}
