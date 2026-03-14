"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";

/** Элемент хлебной крошки: href опционален (без него — текущая страница). */
export type BreadcrumbItemType = {
  label: string;
  href?: string;
};

type PageBreadcrumbProps = {
  items: BreadcrumbItemType[];
};

/**
 * Хлебные крошки для страницы. Последний элемент без href отображается как текущая страница.
 */
export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={index} className="contents">
              <BreadcrumbItem>
                {isLast || item.href == null ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
