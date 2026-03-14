import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";

/**
 * Главная страница админки. Навигация по разделам — в сайдбаре (раскрывающаяся папка «Администрирование»).
 */
export default function AdminDashboardPage() {
  return (
    <div>
      <PageBreadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Администрирование" },
        ]}
      />
      <h1 className="text-xl font-semibold">Панель управления</h1>
      <p className="text-muted-foreground mt-1">
        Выберите раздел в меню.
      </p>
    </div>
  );
}
