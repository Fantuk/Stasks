import { Prisma } from "@prisma/client";
import { UserResponse } from "src/user/application/interfaces/interfaces";
import { User } from "src/user/domain/entities/user.entity";

/** Краткий DTO группы для вложенного ответа (например, в студенте) */
export interface IGroupSummary {
  id: number | null;
  institutionId: number;
  name: string;
}

export interface IStudentResponse {
  id: number | null;
  userId: number;
  groupId: number | null;
  /** При загрузке с include group — название группы для отображения в UI */
  group?: IGroupSummary;
  user?: UserResponse;
}

export class Student {
  private constructor(
    public readonly id: number | null,
    public readonly userId: number,
    public groupId: number | null,
    private _user?: User,
    /** Опциональные данные группы (при загрузке с include group) */
    private _group?: IGroupSummary,
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

  static create(params: { userId: number; groupId: number | null }): Student {
    return new Student(null, params.userId, params.groupId);
  }

  static fromPersistence(raw: {
    id: number;
    userId: number;
    groupId: number | null;
    group?: { id: number; name: string; institutionId: number } | null;
  }): Student {
    const group: IGroupSummary | undefined = raw.group
      ? { id: raw.group.id, institutionId: raw.group.institutionId, name: raw.group.name }
      : undefined;
    return new Student(raw.id, raw.userId, raw.groupId, undefined, group);
  }

  assignToGroup(groupId: number | null) {
    this.groupId = groupId;
  }

  removeFromGroup() {
    this.groupId = null;
  }

  isInGroup() {
    return this.groupId !== null;
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      userId: this.userId,
      groupId: this.groupId,
    };
  }

  toResponse(includeUser: boolean = false) {
    const response: IStudentResponse = {
      id: this.id,
      userId: this.userId,
      groupId: this.groupId,
    };

    if (includeUser && this._user) {
      response.user = this._user.toResponse();
    }
    if (this._group) {
      response.group = this._group;
    }

    return response;
  }
}
