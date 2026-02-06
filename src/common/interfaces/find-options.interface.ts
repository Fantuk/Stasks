export type IncludeOption = 
'user' | 'members' | 'teachers' | 'groups' | 'student' | 'teacher' | 'moderator' | 'profiles';

export interface IFindOneOptions {
  include?: IncludeOption[];
}

export type UserProfileIncludeOption = 'student' | 'teacher' | 'moderator';

export interface IFindUserOptions {
  include?: UserProfileIncludeOption[];
}