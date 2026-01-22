import { v4 } from 'uuid';
import dayjs from 'dayjs';

export class RefreshToken {
  constructor(
    readonly id: number | null,
    readonly token: string,
    readonly userId: number,
    readonly expires: Date,
  ) {}

  static create(userId: number, expiresIn: Date): RefreshToken {
    return new RefreshToken(null, v4(), userId, dayjs(expiresIn).toDate());
  }

  static fromPersistence(raw: {
    id: number;
    token: string;
    userId: number;
    expires: Date;
  }): RefreshToken {
    return new RefreshToken(raw.id, raw.token, raw.userId, raw.expires);
  }

  isExpired(): boolean {
    return dayjs().isAfter(dayjs(this.expires));
  }

  toPersistence() {
    return {
      id: this.id ?? undefined,
      token: this.token,
      userId: this.userId,
      expires: this.expires,
    };
  }

  toResponse() {
    return {
      token: this.token,
      expires: this.expires,
    };
  }
}
