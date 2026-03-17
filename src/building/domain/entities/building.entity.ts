export class Building {
  private constructor(
    public readonly id: number | null,
    public readonly institutionId: number,
    public name: string,
  ) {}

  static create(params: { institutionId: number; name: string }): Building {
    return new Building(null, params.institutionId, params.name);
  }

  static fromPersistence(raw: { id: number; institutionId: number; name: string }): Building {
    return new Building(raw.id, raw.institutionId, raw.name);
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      institutionId: this.institutionId,
      name: this.name,
    };
  }

  toResponse() {
    return {
      id: this.id,
      institutionId: this.institutionId,
      name: this.name,
    };
  }
}
