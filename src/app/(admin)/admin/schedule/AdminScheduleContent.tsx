"use client";

import * as React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { BellsContent } from "@/app/(admin)/admin/schedule/BellsContent";
import { SubjectsScheduleContent } from "@/app/(admin)/admin/schedule/SubjectsScheduleContent";

/**
 * Контент страницы «Расписание»: вкладки «Предметы» и «Звонки».
 */
export function AdminScheduleContent() {
  const [activeTab, setActiveTab] = React.useState("subjects");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Расписание</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="subjects">Предметы</TabsTrigger>
          <TabsTrigger value="bells">Звонки</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="mt-4">
          {/* Логика расписания по предметам с ссылками на преподов и аудитории по макетам Figma */}
          <SubjectsScheduleContent />
        </TabsContent>

        <TabsContent value="bells" className="mt-4">
          <BellsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
