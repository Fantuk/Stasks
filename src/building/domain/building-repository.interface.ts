import { Building } from 'src/building/domain/entities/building.entity';

export interface ISearchBuildingsParams {
  institutionId: number;
  query?: string;
  page?: number;
  limit?: number;
}

export type BuildingIncludeOption = 'floors' | 'floors.classrooms';

export interface IBuildingFindOptions {
  include?: BuildingIncludeOption[];
}

export interface BuildingNestedFloor {
  id: number;
  buildingId: number;
  number: number;
  classrooms?: Array<{ id: number; floorId: number; name: string }>;
}

export type BuildingWithFloors = ReturnType<Building['toResponse']> & {
  floors: BuildingNestedFloor[];
};

export interface IBuildingRepository {
  create(data: Omit<Building, 'id' | 'toPersistence' | 'toResponse'>): Promise<Building>;
  findById(id: number): Promise<Building | null>;
  findByIdWithFloors(id: number, includeClassrooms?: boolean): Promise<BuildingWithFloors | null>;
  findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ): Promise<{ buildings: Building[]; total: number }>;
  search(params: ISearchBuildingsParams): Promise<{ buildings: Building[]; total: number }>;
  update(id: number, data: Partial<Omit<Building, 'id'>>): Promise<Building>;
  remove(id: number): Promise<void>;
}
