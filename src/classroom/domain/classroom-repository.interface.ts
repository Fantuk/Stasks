import { Classroom } from 'src/classroom/domain/entities/classroom.entity';

export interface ISearchClassroomsParams {
  floorId?: number;
  institutionId?: number;
  query?: string;
  page?: number;
  limit?: number;
}

export interface ClassroomNestedFloor {
  id: number;
  buildingId: number;
  number: number;
}

export type ClassroomWithFloor = ReturnType<Classroom['toResponse']> & {
  floor: ClassroomNestedFloor;
};

export interface IClassroomRepository {
  create(data: Omit<Classroom, 'id' | 'toPersistence' | 'toResponse'>): Promise<Classroom>;
  findById(id: number): Promise<Classroom | null>;
  getInstitutionIdByClassroomId(classroomId: number): Promise<number | null>;
  findByIdWithFloor(id: number): Promise<ClassroomWithFloor | null>;
  findByFloorId(
    floorId: number,
    page?: number,
    limit?: number,
  ): Promise<{ classrooms: Classroom[]; total: number }>;
  search(params: ISearchClassroomsParams): Promise<{ classrooms: Classroom[]; total: number }>;
  update(id: number, data: Partial<Omit<Classroom, 'id'>>): Promise<Classroom>;
  remove(id: number): Promise<void>;
}
