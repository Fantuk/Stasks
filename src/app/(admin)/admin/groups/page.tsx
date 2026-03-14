import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import { GroupsContent } from "./GroupsContent";

/**
 * Страница «Группы»: список групп с поиском, пагинацией, созданием и удалением.
 */
export default function AdminGroupsPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Администрирование", href: "/admin" },
          { label: "Группы" },
        ]}
      />
      <h1 className="text-xl font-semibold">Группы</h1>
      <GroupsContent />
    </div>
  );
}
