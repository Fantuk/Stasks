export type IncludeOption = 
'user' | 'members' | 'teachers' | 'groups' | 'student' | 'teacher' | 'moderator' | 'profiles';

export interface IFindOneOptions {
  include?: IncludeOption[];
}

export type UserProfileIncludeOption = 'student' | 'teacher' | 'moderator';

export interface IFindUserOptions {
  include?: UserProfileIncludeOption[];
}

export type BuildingIncludeOption = 'floors' | 'floors.classrooms';

export interface IBuildingFindOptions {
  include?: BuildingIncludeOption[];
}

export type FloorIncludeOption = 'classrooms';

export interface IFloorFindOptions {
  include?: FloorIncludeOption[];
}

export type ClassroomIncludeOption = 'floor';

export interface IClassroomFindOptions {
  include?: ClassroomIncludeOption[];
}