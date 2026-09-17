"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconClipboardList,
  IconDiscount2,
  IconLayoutDashboard,
  IconPhoto,
  IconShirt,
  IconStack2,
  IconTag,
  IconUsers,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Огляд", icon: IconLayoutDashboard },
  { href: "/admin/orders", label: "Замовлення", icon: IconClipboardList },
  { href: "/admin/products", label: "Товари", icon: IconShirt },
  { href: "/admin/categories", label: "Категорії", icon: IconStack2 },
  { href: "/admin/promotions", label: "Акції", icon: IconTag },
  { href: "/admin/promo-codes", label: "Промокоди", icon: IconDiscount2 },
  { href: "/admin/banner", label: "Банер", icon: IconPhoto },
  { href: "/admin/users", label: "Користувачі", icon: IconUsers },
] as const;

export const ADMIN_PRIMARY_HREFS = [
  "/admin",
  "/admin/orders",
  "/admin/products",
] as const;

export function isAdminLinkActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminPrimaryHref(href: string) {
  return (ADMIN_PRIMARY_HREFS as readonly string[]).includes(href);
}

export function AdminNavLinks({
  onNavigate,
  only,
}: {
  onNavigate?: () => void;
  only?: "secondary";
}) {
  const pathname = usePathname();
  const links =
    only === "secondary"
      ? ADMIN_LINKS.filter((link) => !isAdminPrimaryHref(link.href))
      : ADMIN_LINKS;

  return (
    <nav className="flex flex-col gap-1" aria-label="Розділи адмінки">
      {links.map((link) => {
        const active = isAdminLinkActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              buttonVariants({
                variant: active ? "secondary" : "ghost",
                size: "lg",
              }),
              "h-12 justify-start lg:h-8 lg:text-sm",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon data-icon="inline-start" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
