import { User } from 'src/user/domain/entities/user.entity';
import type { Prisma } from '@prisma/client';
import { UserResponse } from 'src/user/application/interfaces/interfaces';

/** Краткий DTO группы для вложенного ответа (например, курируемая группа преподавателя) */
export interface IGroupSummary {
  id: number | null;
  institutionId: number;
  name: string;
}

/** Краткий DTO предмета для списка в ответе преподавателя */
export interface ISubjectSummary {
  id: number;
  name: string;
}

export interface ITeacherResponse {
  id: number | null;
  userId: number;
  mentoredGroupId: number | null;
  /** При загрузке с include group — название курируемой группы для отображения в UI */
  mentoredGroup?: IGroupSummary;
  /** Список предметов преподавателя (при загрузке с teacherSubjects) */
  subjects?: ISubjectSummary[];
  user?: UserResponse;
}

export class Teacher {
  private constructor(
    public readonly id: number | null,
    public readonly userId: number,
    private mentoredGroupId: number | null,
    private _user?: User,
    /** Опциональные данные курируемой группы (при загрузке с include group) */
    private _mentoredGroup?: IGroupSummary,
    /** Опциональный список предметов (при загрузке с teacherSubjects) */
    private _subjects?: ISubjectSummary[],
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
    group?: { id: number; name: string; institutionId: number } | null;
    subjects?: ISubjectSummary[];
  }): Teacher {
    const mentoredGroup: IGroupSummary | undefined = raw.group
      ? { id: raw.group.id, institutionId: raw.group.institutionId, name: raw.group.name }
      : undefined;
    return new Teacher(raw.id, raw.userId, raw.mentoredGroupId, undefined, mentoredGroup, raw.subjects);
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
    if (this._mentoredGroup) {
      response.mentoredGroup = this._mentoredGroup;
    }
    if (this._subjects?.length) {
      response.subjects = this._subjects;
    }

    return response;
  }
}
