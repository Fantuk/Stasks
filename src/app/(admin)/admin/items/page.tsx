import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import { SubjectsContent } from "./SubjectsContent";

/**
 * Страница «Предметы»: список предметов с поиском, пагинацией, созданием и удалением.
 */
export default function AdminItemsPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Администрирование", href: "/admin" },
          { label: "Предметы" },
        ]}
      />
      <h1 className="text-xl font-semibold">Предметы</h1>
      <SubjectsContent />
    </div>
  );
}
