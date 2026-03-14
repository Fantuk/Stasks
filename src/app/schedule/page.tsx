import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import { ScheduleViewContent } from "@/app/schedule/ScheduleViewContent";

/**
 * Страница просмотра расписания: доступна всем авторизованным пользователям.
 * Только отображение, без редактирования.
 */
export default function SchedulePage() {
  return (
    <>
      <PageBreadcrumb
        items={[{ label: "Главная", href: "/" }, { label: "Расписание" }]}
      />
      <ScheduleViewContent />
    </>
  );
}
