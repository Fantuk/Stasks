export class Floor {
  private constructor(
    public readonly id: number | null,
    public readonly buildingId: number,
    public number: number,
  ) {}

  static create(params: { buildingId: number; number: number }): Floor {
    return new Floor(null, params.buildingId, params.number);
  }

  static fromPersistence(raw: {
    id: number;
    buildingId: number;
    number: number;
  }): Floor {
    return new Floor(raw.id, raw.buildingId, raw.number);
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      buildingId: this.buildingId,
      number: this.number,
    };
  }

  toResponse() {
    return {
      id: this.id,
      buildingId: this.buildingId,
      number: this.number,
    };
  }
}
