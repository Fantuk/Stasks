"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { NewUserForm } from "@/app/(admin)/admin/users/NewUserForm";
import { UsersStudentsSection } from "@/app/(admin)/admin/users/UsersStudentsSection";
import { UsersTeachersSection } from "@/app/(admin)/admin/users/UsersTeachersSection";
import { UsersModeratorsSection } from "@/app/(admin)/admin/users/UsersModeratorsSection";

/**
 * Контент страницы пользователей админки: вкладки «Регистрация», «Студенты», «Преподаватели», «Модераторы».
 */
export function AdminUsersContent() {
  const [activeTab, setActiveTab] = React.useState("registration");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Пользователи</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="registration">Регистрация</TabsTrigger>
          <TabsTrigger value="students">Студенты</TabsTrigger>
          <TabsTrigger value="teachers">Преподаватели</TabsTrigger>
          <TabsTrigger value="moderators">Модераторы</TabsTrigger>
        </TabsList>

        <TabsContent value="registration" className="mt-4">
          <NewUserForm embedded />
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <UsersStudentsSection />
        </TabsContent>

        <TabsContent value="teachers" className="mt-4">
          <UsersTeachersSection />
        </TabsContent>

        <TabsContent value="moderators" className="mt-4">
          <UsersModeratorsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
