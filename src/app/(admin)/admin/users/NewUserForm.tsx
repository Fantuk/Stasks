"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { Role } from "@/stores/auth.store";

/** Допустимые роли при создании. Нельзя комбинировать STUDENT с TEACHER или MODERATOR. */
const ROLE_CHECKBOXES: Role[] = ["STUDENT", "TEACHER", "MODERATOR"];

type RegisterBody = {
  name: string;
  surname: string;
  patronymic?: string;
  email: string;
  password: string;
  roles: Role[];
};

type NewUserFormProps = {
  /** Если true, после успешной отправки не делать редирект (для встраивания во вкладку) */
  embedded?: boolean;
};

/**
 * Форма добавления пользователя: валидация, отправка на API, редирект после успеха (если не embedded).
 */
export function NewUserForm({ embedded = false }: NewUserFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [surname, setSurname] = React.useState("");
  const [patronymic, setPatronymic] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [roles, setRoles] = React.useState<Role[]>(["STUDENT"]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function validate(): string | null {
    const n = name.trim();
    const s = surname.trim();
    const p = patronymic.trim();
    if (n.length < 2 || n.length > 30)
      return "Имя должно быть от 2 до 30 символов.";
    if (s.length < 2 || s.length > 30)
      return "Фамилия должна быть от 2 до 30 символов.";
    if (p.length > 0 && (p.length < 2 || p.length > 30))
      return "Отчество должно быть от 2 до 30 символов или пустым.";
    if (!email.trim()) return "Введите email.";
    if (password.length < 5 || password.length > 30)
      return "Пароль должен быть от 5 до 30 символов.";
    if (roles.length === 0) return "Выберите хотя бы одну роль.";
    // Нельзя STUDENT вместе с TEACHER или MODERATOR
    if (roles.includes("STUDENT") && roles.some((r) => r === "TEACHER" || r === "MODERATOR"))
      return "Роль STUDENT нельзя комбинировать с TEACHER или MODERATOR.";
    return null;
  }

  /** Переключение роли: STUDENT несовместим с TEACHER/MODERATOR. При выборе STUDENT — только STUDENT; при выборе TEACHER/MODERATOR снимаем STUDENT. */
  function toggleRole(r: Role) {
    setRoles((prev) => {
      const isAdding = !prev.includes(r);
      if (isAdding && r === "STUDENT") return ["STUDENT"];
      if (isAdding && (r === "TEACHER" || r === "MODERATOR"))
        return [...prev.filter((x) => x !== "STUDENT"), r];
      return prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setIsSubmitting(true);
    try {
      const body: RegisterBody = {
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        password,
        roles,
      };
      if (patronymic.trim()) body.patronymic = patronymic.trim();

      await api.post("/api/auth/register", body);
      if (!embedded) {
        router.push("/admin/users");
      } else {
        // Сброс формы и оставляем на странице
        setName("");
        setSurname("");
        setPatronymic("");
        setEmail("");
        setPassword("");
        setRoles(["STUDENT"]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось создать пользователя."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {!embedded && (
        <div className="mb-4">
          <Link
            href="/admin/users"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← К списку пользователей
          </Link>
        </div>
      )}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Добавить пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={30}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Фамилия *</Label>
                <Input
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  minLength={2}
                  maxLength={30}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="patronymic">Отчество</Label>
              <Input
                id="patronymic"
                value={patronymic}
                onChange={(e) => setPatronymic(e.target.value)}
                minLength={2}
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={5}
                maxLength={30}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Роли *</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_CHECKBOXES.map((r) => (
                  <label key={r} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roles.includes(r)}
                      onChange={() => toggleRole(r)}
                    />
                    {r}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Допустимо: одна роль или TEACHER и MODERATOR. Нельзя: STUDENT с TEACHER или MODERATOR.
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Создаём..." : "Создать пользователя"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
