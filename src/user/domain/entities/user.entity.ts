import { Role } from '@prisma/client';

export class User {
  private constructor(
    public readonly id: number | null,
    public readonly institutionId: number,
    public name: string,
    public surname: string,
    public patronymic: string | null,
    public email: string,
    public password: string,
    public roles: Role[],
    public isActivated: boolean,
  ) {}

  static create(params: {
    institutionId: number;
    name: string;
    surname: string;
    patronymic: string | null;
    email: string;
    password: string;
    roles: Role[];
    isActivated?: boolean;
  }): User {
    return new User(
      null,
      params.institutionId,
      params.name,
      params.surname,
      params.patronymic ?? null,
      params.email,
      params.password,
      params.roles,
      !!params.isActivated,
    );
  }

  static fromPersistence(raw: {
    id: number;
    institutionId: number;
    name: string;
    surname: string;
    patronymic: string | null;
    email: string;
    password: string;
    roles: Role[];
    isActivated: boolean;
  }): User {
    return new User(
      raw.id,
      raw.institutionId,
      raw.name,
      raw.surname,
      raw.patronymic,
      raw.email,
      raw.password,
      raw.roles,
      raw.isActivated,
    );
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      institutionId: this.institutionId,
      name: this.name,
      surname: this.surname,
      patronymic: this.patronymic,
      email: this.email,
      password: this.password,
      roles: this.roles,
      isActivated: this.isActivated,
    };
  }

  toResponse() {
    return {
      id: this.id,
      institutionId: this.institutionId,
      name: this.name,
      surname: this.surname,
      patronymic: this.patronymic,
      email: this.email,
      roles: this.roles,
      isActivated: this.isActivated,
    };
  }
}
