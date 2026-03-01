import { ForbiddenException } from '@nestjs/common';

const DEFAULT_MESSAGE = 'Нет доступа к ресурсу из другого учреждения';

/**
 * Проверяет, что ресурс принадлежит учреждению пользователя.
 * Если userInstitutionId не передан — проверка не выполняется (доступ без ограничения).
 * При несовпадении учреждений выбрасывает ForbiddenException.
 *
 * @param resourceInstitutionId — institutionId ресурса (здание, этаж, аудитория, группа и т.д.)
 * @param userInstitutionId — institutionId текущего пользователя (из JWT/сессии)
 * @param forbiddenMessage — текст ошибки при отказе (опционально)
 */
export function ensureInstitutionAccess(
  resourceInstitutionId: number | null | undefined,
  userInstitutionId: number | undefined,
  forbiddenMessage: string = DEFAULT_MESSAGE,
): void {
  if (userInstitutionId === undefined) return;
  if (resourceInstitutionId !== userInstitutionId) {
    throw new ForbiddenException(forbiddenMessage);
  }
}
