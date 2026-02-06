export class Subject {
    private constructor(
        public readonly id: number | null,
        public readonly institutionId: number,
        public name: string
    ) { }

    static create(params: { institutionId: number; name: string }): Subject {
        return new Subject(null, params.institutionId, params.name)
    }

    static fromPersistence(raw: {
        id: number,
        institutionId: number,
        name: string
    }): Subject {
        return new Subject(raw.id, raw.institutionId, raw.name)
    }

    toPersistence() {
        return {
            id: this.id ?? undefined,
            institutionId: this.institutionId,
            name: this.name
        }
    }

    toResponse() {
        return {
            id: this.id,
            institutionId: this.institutionId,
            name: this.name
        }
    }
}