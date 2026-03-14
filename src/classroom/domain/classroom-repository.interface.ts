import { Classroom } from 'src/classroom/domain/entities/classroom.entity';

export interface ISearchClassroomsParams {
  floorId?: number;
  institutionId?: number;
  query?: string;
  page?: number;
  limit?: number;
}

/** Корпус (для вложенного ответа, напр. в расписании) */
export interface ClassroomNestedBuilding {
  id: number;
  name: string;
}

export interface ClassroomNestedFloor {
  id: number;
  buildingId: number;
  number: number;
  /** Корпус (при запросе с include=floor) */
  building?: ClassroomNestedBuilding;
}

export type ClassroomWithFloor = ReturnType<Classroom['toResponse']> & {
  floor: ClassroomNestedFloor;
  /** Приводится из floor.building, чтобы не делать отдельный запрос getInstitutionIdByClassroomId */
  institutionId: number;
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
