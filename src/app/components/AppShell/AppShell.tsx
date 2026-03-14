"use client";

import { usePathname } from "next/navigation";
import { SidebarLayout } from "@/app/components/SidebarLayout/SidebarLayout";

/**
 * Оболочка приложения: на странице логина рендерит только children,
 * на остальных страницах — сайдбар + контент (SidebarLayout).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
