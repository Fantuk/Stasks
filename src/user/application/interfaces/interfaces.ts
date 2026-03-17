import { Role } from '@prisma/client';
import { ICreateModeratorParams } from 'src/moderator/application/interfaces/interfaces';
import { IModeratorAccessRights } from 'src/moderator/domain/entities/moderator.entity';
import { ICreateStudentParams } from 'src/student/application/interfaces/interfaces';
import { ICreateTeacherParams } from 'src/teacher/application/interfaces/interfaces';

import { IStudentResponse } from 'src/student/domain/entities/student.entity';
import { ITeacherResponse } from 'src/teacher/domain/entities/teacher.entity';
import { IModeratorResponse } from 'src/moderator/domain/entities/moderator.entity';

export interface ICreateUserParams {
  institutionId?: number;
  name: string;
  surname: string;
  patronymic: string | null;
  email: string;
  password: string;
  roles: Role[];
  isActivated?: boolean;

  // Специфичные данные для ролей
  moderatorData?: { accessRights?: IModeratorAccessRights };
  teacherData?: { mentoredGroupId?: number };
  studentData?: { groupId?: number };
}

export type UserResponse = {
  id: number | null;
  institutionId: number;
  name: string;
  surname: string;
  patronymic: string | null;
  email: string;
  roles: Role[];
  isActivated: boolean;
};

export interface IFullUser {
  user: UserResponse;
  moderator?: ICreateModeratorParams | null;
  teacher?: ICreateTeacherParams | null;
  student?: ICreateStudentParams | null;
}

export type UserWithProfilesResponse = UserResponse & {
  student?: IStudentResponse;
  teacher?: ITeacherResponse;
  moderator?: IModeratorResponse;
};
