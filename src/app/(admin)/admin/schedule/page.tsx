import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import { AdminScheduleContent } from "@/app/(admin)/admin/schedule/AdminScheduleContent";

/**
 * Страница «Расписание»: вкладки «Предметы» и «Звонки».
 */
export default function AdminSchedulePage() {
  return (
    <>
      <PageBreadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Администрирование", href: "/admin" },
          { label: "Расписание" },
        ]}
      />
      <AdminScheduleContent />
    </>
  );
}
