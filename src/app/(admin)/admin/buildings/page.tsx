import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import { BuildingsContent } from "./BuildingsContent";

/**
 * Страница «Здания»: список зданий с поиском, пагинацией, созданием и удалением.
 */
export default function AdminBuildingsPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Администрирование", href: "/admin" },
          { label: "Здания" },
        ]}
      />
      <h1 className="text-xl font-semibold">Здания</h1>
      <BuildingsContent />
    </div>
  );
}
