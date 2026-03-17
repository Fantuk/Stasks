export class Classroom {
  private constructor(
    public readonly id: number | null,
    public readonly floorId: number,
    public name: string,
  ) {}

  static create(params: { floorId: number; name: string }): Classroom {
    return new Classroom(null, params.floorId, params.name);
  }

  static fromPersistence(raw: { id: number; floorId: number; name: string }): Classroom {
    return new Classroom(raw.id, raw.floorId, raw.name);
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      floorId: this.floorId,
      name: this.name,
    };
  }

  toResponse() {
    return {
      id: this.id,
      floorId: this.floorId,
      name: this.name,
    };
  }
}
