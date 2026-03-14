"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, hasAdminAccess } from "@/stores/auth.store";

/**
 * Клиентская обёртка админ-раздела: проверка авторизации и роли.
 * Редирект на /login при отсутствии пользователя, на / при отсутствии admin/moderator.
 * Навигация и выход вынесены в общий сайдбар (SidebarLayout).
 */
export function AdminLayoutClient({
  children,
}: { children: React.ReactNode }) {
  const router = useRouter();
  const authReady = useAuthStore((s) => s.authReady);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!hasAdminAccess(user.roles)) {
      router.replace("/");
      return;
    }
  }, [authReady, user, router]);

  if (!authReady || !user || !hasAdminAccess(user.roles)) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return <>{children}</>;
}
