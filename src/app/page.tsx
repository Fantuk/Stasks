import { HomeContent } from "@/app/components/HomeContent/HomeContent";
import { PageBreadcrumb } from "@/app/components/PageBreadcrumb/PageBreadcrumb";

export default function Home() {
  return (
    <>
      <PageBreadcrumb items={[{ label: "Главная" }]} />
      <HomeContent />
    </>
  );
}
