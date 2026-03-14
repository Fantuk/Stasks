import { AdminLayoutClient } from "@/app/components/AdminLayout/AdminLayoutClient";

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
