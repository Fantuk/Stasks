import { Floor } from 'src/floor/domain/entities/floor.entity';

export interface ISearchFloorsParams {
  buildingId?: number;
  institutionId?: number;
  number?: number;
  page?: number;
  limit?: number;
}

export interface FloorNestedClassroom {
  id: number;
  floorId: number;
  name: string;
}

export type FloorWithClassrooms = ReturnType<Floor['toResponse']> & {
  classrooms: FloorNestedClassroom[];
};

export interface IFloorRepository {
  create(data: Omit<Floor, 'id' | 'toPersistence' | 'toResponse'>): Promise<Floor>;
  findById(id: number): Promise<Floor | null>;
  getInstitutionIdByFloorId(floorId: number): Promise<number | null>;
  findByIdWithClassrooms(id: number): Promise<FloorWithClassrooms | null>;
  findByBuildingId(
    buildingId: number,
    page?: number,
    limit?: number,
  ): Promise<{ floors: Floor[]; total: number }>;
  search(params: ISearchFloorsParams): Promise<{ floors: Floor[]; total: number }>;
  update(id: number, data: Partial<Omit<Floor, 'id'>>): Promise<Floor>;
  remove(id: number): Promise<void>;
}
