import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Обрабатывает ошибку из Prisma: при нарушении уникальности (P2002) бросает ConflictException
 * с заданным сообщением, иначе — InternalServerErrorException.
 * Убирает дублирование try/catch и проверки кода во всех репозиториях.
 *
 * @param error — пойманная ошибка (unknown)
 * @param conflictMessage — сообщение для 409 при P2002
 * @param fallbackMessage — сообщение для 500 при прочих ошибках (опционально)
 */
export function handlePrismaUniqueConflict(
  error: unknown,
  conflictMessage: string,
  fallbackMessage = 'Внутренняя ошибка при операции с базой данных',
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(conflictMessage);
  }
  throw new InternalServerErrorException(fallbackMessage);
}
