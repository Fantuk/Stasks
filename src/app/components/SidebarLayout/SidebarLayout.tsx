"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore, hasAdminAccess } from "@/stores/auth.store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
} from "@/app/components/ui/sidebar";
import { Calendar, ChevronDown, Home, LayoutDashboard } from "lucide-react";

/** Формат «Фамилия И.О.» для отображения в сайдбаре. */
function formatSurnameInitials(
  surname: string,
  name: string,
  patronymic?: string | null,
): string {
  const i = name.trim().charAt(0).toUpperCase();
  const o = patronymic?.trim().charAt(0).toUpperCase();
  return o ? `${surname} ${i}.${o}.` : `${surname} ${i}.`;
}

/**
 * Layout с сайдбаром: навигация (Главная, Администрирование как раскрывающаяся папка).
 * Вкладка «Администрирование» показывается только пользователям с ролью ADMIN или MODERATOR.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const showAdminTab = user ? hasAdminAccess(user.roles) : false;

  const isAdminPath = pathname?.startsWith("/admin") ?? false;
  const [adminOpen, setAdminOpen] = useState(isAdminPath);
  useEffect(() => {
    if (isAdminPath) setAdminOpen(true);
  }, [isAdminPath]);

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <span className="font-semibold text-sidebar-foreground">STasks</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/"}
                    tooltip="Главная"
                  >
                    <Link href="/">
                      <Home className="size-4" />
                      <span>Главная</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/schedule"}
                    tooltip="Расписание"
                  >
                    <Link href="/schedule">
                      <Calendar className="size-4" />
                      <span>Расписание</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {showAdminTab && (
                  <SidebarMenuItem>
                    <Collapsible
                      open={adminOpen}
                      onOpenChange={setAdminOpen}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className="group"
                          isActive={isAdminPath}
                          tooltip="Администрирование"
                        >
                          <LayoutDashboard className="size-4" />
                          <span>Администрирование</span>
                          <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname?.startsWith("/admin/users") ?? false}
                            >
                              <Link href="/admin/users">Пользователи</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === "/admin/groups"}
                            >
                              <Link href="/admin/groups">Группы</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === "/admin/items"}
                            >
                              <Link href="/admin/items">Предметы</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname?.startsWith("/admin/schedule") ?? false}
                            >
                              <Link href="/admin/schedule">Расписание</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === "/admin/buildings"}
                            >
                              <Link href="/admin/buildings">Здания</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex flex-col gap-2 p-2">
            {user && (
              <Link
                href="/profile"
                className="text-xs text-muted-foreground truncate px-2 block rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {formatSurnameInitials(user.surname, user.name, user.patronymic)}
              </Link>
            )}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <span>Выйти</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
