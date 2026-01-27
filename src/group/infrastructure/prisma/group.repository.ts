import { Injectable, ConflictException, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Group } from "src/group/domain/entities/group.entity";
import { IGroupRepository } from "src/group/domain/group-repository.interface";
import { Prisma } from "@prisma/client";

@Injectable()
export class GroupRepository implements IGroupRepository {
    constructor(private readonly prisma: PrismaService) { }

    private readonly groupSelect = {
        id: true,
        institutionId: true,
        name: true
    } as const

    private mapToDomain(raw: Prisma.GroupGetPayload<{}>): Group {
        return Group.fromPersistence({
            id: raw.id,
            institutionId: raw.institutionId,
            name: raw.name
        })
    }

    async create(data: Omit<Group, "id">): Promise<Group> {
        try {
            const group = Group.create(data)
            const saved = await this.prisma.group.create({
                data: group.toPersistence(),
                select: this.groupSelect
            })
            return this.mapToDomain(saved)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Группа с таким именем уже существует');
                }
            }
            throw new InternalServerErrorException('Ошибка при создании группы');
        }
    }

    async findById(id: number): Promise<Group | null> {
        const raw = await this.prisma.group.findUnique({
            where: { id },
            select: this.groupSelect
        })
        return raw ? this.mapToDomain(raw) : null
    }

    async findByInstitutionId(
        institutionId: number,
        page?: number,
        limit?: number
    ): Promise<{ groups: Group[]; total: number; }> {
        const skip = page && limit ? (page - 1) * limit : undefined;
        const take = limit

        const total = await this.prisma.group.count({
            where: { institutionId }
        })

        const raw = await this.prisma.group.findMany({
            where: { institutionId },
            select: this.groupSelect,
            skip,
            take,
            orderBy: { id: "asc" }
        })

        return {
            groups: raw.map(this.mapToDomain),
            total
        }
    }

    async update(id: number, data: Partial<Omit<Group, "id">>): Promise<Group> {
        try {
            const updateData: Prisma.GroupUpdateInput = data instanceof Group ? data.toPersistence() : data;

            const updated = await this.prisma.group.update({
                where: { id },
                data: updateData,
                select: this.groupSelect
            })
            return this.mapToDomain(updated)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Группа с таким именем уже существует');
                }
            }
            throw new InternalServerErrorException('Ошибка при обновлении группы');
        }
    }

    async remove(id: number): Promise<void> {
        await this.prisma.group.delete({ where: { id } })
    }
}