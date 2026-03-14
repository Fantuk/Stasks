import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";
import { AdminUsersContent } from "@/app/(admin)/admin/users/AdminUsersContent";

export default function AdminUsersPage() {
  return (
    <>
      <PageBreadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Администрирование", href: "/admin" },
          { label: "Пользователи" },
        ]}
      />
      <AdminUsersContent />
    </>
  );
}
