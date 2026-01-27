import { Group } from "src/group/domain/entities/group.entity";

export interface IGroupRepository {
    create(data: Omit<Group, 'id' | "toPersistance" | 'toResponse'>): Promise<Group>
    findById(id: number): Promise<Group | null>
    findByInstitutionId(
        institutionId: number,
        page?: number,
        limit?: number): Promise<{ groups: Group[]; total: number }>
    update(id: number, data: Partial<Omit<Group, 'id'>>): Promise<Group>;
    remove(id: number): Promise<void>;
}