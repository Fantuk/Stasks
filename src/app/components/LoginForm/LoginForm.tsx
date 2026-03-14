"use client";

import * as React from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
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
import { api } from "@/lib/api";
import {
  useAuthStore,
  hasAdminAccess,
  type AuthUser,
} from "@/stores/auth.store";

type LoginResponse = {
  success?: boolean;
  data?: { accessToken: string };
  errors?: string[];
};

/**
 * Форма входа: состояние, отправка на API, сохранение токена и пользователя, редирект по роли.
 */
export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const router = useRouter();
  const setTokenAndPersist = useAuthStore((s) => s.setTokenAndPersist);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<LoginResponse>("/api/auth/login", {
        email: normalizedEmail,
        password,
      });

      const { success, data, errors } = response.data;

      if (!success) {
        if (errors && errors.length > 0) {
          setError(errors.join(", "));
        } else {
          setError("Не удалось выполнить вход. Попробуйте ещё раз.");
        }
        return;
      }

      if (data?.accessToken) {
        setTokenAndPersist(data.accessToken);
      }

      const meRes = await api.get<{ success?: boolean; data?: AuthUser }>(
        "/api/users/me",
      );
      if (meRes.data?.success && meRes.data?.data) {
        setUser(meRes.data.data as AuthUser);
        const roles = meRes.data.data.roles ?? [];
        if (hasAdminAccess(roles)) {
          router.push("/admin/users");
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch (err) {
      const axiosError = err as AxiosError<LoginResponse>;
      const responseErrors = axiosError.response?.data?.errors;
      if (responseErrors && responseErrors.length > 0) {
        setError(responseErrors.join(", "));
      } else {
        setError(
          axiosError.response?.status === 401
            ? "Неверный email или пароль."
            : "Ошибка соединения с сервером. Попробуйте ещё раз.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>
          Введите email и пароль, чтобы продолжить.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <p className="min-h-5 text-sm text-destructive" aria-live="polite">
            {error ?? ""}
          </p>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Входим..." : "Войти"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
