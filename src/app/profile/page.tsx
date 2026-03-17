"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { useAuthStore } from "@/stores/auth.store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import type { UserProfileResponse } from "@/app/profile/types";

/** Человекочитаемые названия прав модератора */
const MODERATOR_RIGHT_LABELS: Record<string, string> = {
  canRegisterUsers: "Регистрация пользователей",
  canDeleteUsers: "Удаление пользователей",
};

/** Названия ролей для отображения */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  MODERATOR: "Модератор",
  TEACHER: "Преподаватель",
  STUDENT: "Студент",
};

/** Форма редактирования ФИО и email */
type EditForm = {
  name: string;
  surname: string;
  patronymic: string;
  email: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({ name: "", surname: "", patronymic: "", email: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const startEditing = () => {
    if (!profile) return;
    setForm({
      name: profile.name,
      surname: profile.surname,
      patronymic: profile.patronymic ?? "",
      email: profile.email,
    });
    setSubmitError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const res = await api.patch<{ success?: boolean; data?: UserProfileResponse; message?: string }>(
        "/api/users/me",
        {
          name: form.name.trim(),
          surname: form.surname.trim(),
          patronymic: form.patronymic.trim() || null,
          email: form.email.trim(),
        },
      );
      if (res.data?.success && res.data?.data) {
        setProfile(res.data.data);
        setUser({
          id: res.data.data.id,
          institutionId: res.data.data.institutionId,
          name: res.data.data.name,
          surname: res.data.data.surname,
          patronymic: res.data.data.patronymic ?? undefined,
          email: res.data.data.email,
          roles: res.data.data.roles,
          isActivated: res.data.data.isActivated,
        });
        setIsEditing(false);
      } else {
        setSubmitError(res.data?.message ?? "Не удалось обновить данные");
      }
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err, "Ошибка при сохранении"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Новый пароль и подтверждение не совпадают");
      return;
    }
    if (passwordForm.newPassword.length < 5 || passwordForm.newPassword.length > 30) {
      setPasswordError("Пароль должен быть от 5 до 30 символов");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await api.patch<{ success?: boolean; message?: string }>(
        "/api/users/me/password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      );
      if (res.data?.success) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(res.data?.message ?? "Не удалось сменить пароль");
      }
    } catch (err: unknown) {
      setPasswordError(getApiErrorMessage(err, "Ошибка при смене пароля"));
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get<{ success?: boolean; data?: UserProfileResponse }>(
          "/api/users/me",
          { params: { include: "profiles" } },
        );
        if (cancelled) return;
        if (res.data?.success && res.data?.data) {
          setProfile(res.data.data);
        } else {
          setError("Не удалось загрузить профиль");
        }
      } catch (e) {
        if (cancelled) return;
        setError("Ошибка загрузки профиля");
        // 401 обрабатывается интерцептором (редирект на логин)
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <PageBreadcrumb
          items={[{ label: "Главная", href: "/" }, { label: "Профиль" }]}
        />
        <div className="text-muted-foreground">Загрузка профиля…</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl space-y-4">
        <PageBreadcrumb
          items={[{ label: "Главная", href: "/" }, { label: "Профиль" }]}
        />
        <p className="text-destructive">{error ?? "Профиль не найден"}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-2 text-sm text-primary hover:underline"
        >
          На главную
        </button>
      </div>
    );
  }

  const hasStudent = profile.roles.includes("STUDENT") && profile.student;
  const hasTeacher = profile.roles.includes("TEACHER") && profile.teacher;
  const hasModerator = profile.roles.includes("MODERATOR") && profile.moderator;
  const hasAdmin = profile.roles.includes("ADMIN");

  return (
    <div className="max-w-2xl space-y-6">
      <PageBreadcrumb
        items={[{ label: "Главная", href: "/" }, { label: "Профиль" }]}
      />
      <h1 className="text-2xl font-semibold">Профиль</h1>

      {/* Общие данные */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Основные данные</CardTitle>
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" onClick={startEditing}>
              Редактировать
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancelEditing} disabled={submitLoading}>
                Отмена
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="profile-surname">Фамилия</Label>
                <Input
                  id="profile-surname"
                  value={form.surname}
                  onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
                  minLength={2}
                  maxLength={30}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Имя</Label>
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  minLength={2}
                  maxLength={30}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-patronymic">Отчество</Label>
                <Input
                  id="profile-patronymic"
                  value={form.patronymic}
                  onChange={(e) => setForm((f) => ({ ...f, patronymic: e.target.value }))}
                  minLength={2}
                  maxLength={30}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              {submitError && (
                <p className="text-destructive text-sm">{submitError}</p>
              )}
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? "Сохранение…" : "Сохранить"}
              </Button>
            </form>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground text-sm">ФИО: </span>
                <span>
                  {profile.surname} {profile.name}
                  {profile.patronymic ? ` ${profile.patronymic}` : ""}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Email: </span>
                <span>{profile.email}</span>
              </div>
            </>
          )}
          {!isEditing && (
            <>
              <div>
                <span className="text-muted-foreground text-sm">Роли: </span>
                <span className="flex flex-wrap gap-1.5 mt-1">
                  {profile.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-md bg-muted px-2 py-0.5 text-sm"
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  ))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Статус: </span>
                <span>{profile.isActivated ? "Активен" : "Не активирован"}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Сменить пароль */}
      <Card>
        <CardHeader>
          <CardTitle>Сменить пароль</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
            <div className="grid gap-2">
              <Label htmlFor="profile-current-password">Текущий пароль</Label>
              <Input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-new-password">Новый пароль</Label>
              <Input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                minLength={5}
                maxLength={30}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-confirm-password">Подтвердите новый пароль</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                minLength={5}
                maxLength={30}
                required
              />
            </div>
            {passwordError && (
              <p className="text-destructive text-sm">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-green-600 dark:text-green-400 text-sm">
                Пароль успешно изменён.
              </p>
            )}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Сохранение…" : "Сменить пароль"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Студент: группа */}
      {hasStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Студент</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-muted-foreground text-sm">Группа: </span>
              <span>
                {profile.student!.group?.name ?? "Группа не назначена"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Преподаватель: курируемая группа и предметы */}
      {hasTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>Преподаватель</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground text-sm">
                Курируемая группа:{" "}
              </span>
              <span>
                {profile.teacher!.mentoredGroup?.name ?? "Не назначена"}
              </span>
            </div>
            {profile.teacher!.subjects && profile.teacher!.subjects.length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">
                  Предметы:{" "}
                </span>
                <span>
                  {profile.teacher!.subjects.map((s) => s.name).join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Модератор: права */}
      {hasModerator && (
        <Card>
          <CardHeader>
            <CardTitle>Модератор</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm mb-2">Права:</div>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(profile.moderator!.accessRights)
                .filter(([, value]) => value === true)
                .map(([key]) => (
                  <li key={key}>
                    {MODERATOR_RIGHT_LABELS[key] ?? key}
                  </li>
                ))}
              {Object.values(profile.moderator!.accessRights).filter(Boolean).length === 0 && (
                <li className="text-muted-foreground">Нет назначенных прав</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Админ: заглушка */}
      {hasAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Администратор</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Полный доступ к системе.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
