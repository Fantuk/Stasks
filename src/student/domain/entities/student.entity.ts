import { Prisma } from "@prisma/client";
import { UserResponse } from "src/user/application/interfaces/interfaces";
import { User } from "src/user/domain/entities/user.entity";

export interface IStudentResponse {
  id: number | null;
  userId: number;
  groupId: number | null;
  user?: UserResponse;
}

export class Student {
  private constructor(
    public readonly id: number | null,
    public readonly userId: number,
    public groupId: number | null,
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

  static create(params: { userId: number; groupId: number | null }): Student {
    return new Student(null, params.userId, params.groupId);
  }

  static fromPersistence(raw: {
    id: number;
    userId: number;
    groupId: number | null;
  }): Student {
    return new Student(raw.id, raw.userId, raw.groupId);
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

    return response;
  }
}
