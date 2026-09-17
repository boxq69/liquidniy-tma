"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBuildingStore, IconDots } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  ADMIN_LINKS,
  AdminNavLinks,
  isAdminLinkActive,
  isAdminPrimaryHref,
} from "@/components/admin/admin-nav";
import { waitForTelegramWebApp } from "@/lib/telegram/webapp-client";

function tap() {
  void waitForTelegramWebApp().then((wa) => {
    wa?.HapticFeedback?.selectionChanged();
  });
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const current =
    ADMIN_LINKS.find((link) => isAdminLinkActive(pathname, link.href))?.label ??
    "Адмінка";
  const moreActive = ADMIN_LINKS.some(
    (link) =>
      !isAdminPrimaryHref(link.href) && isAdminLinkActive(pathname, link.href),
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center px-5">
          <p className="font-heading text-base font-semibold">LIQ Admin</p>
        </div>
        <Separator />
        <div className="flex flex-1 flex-col gap-4 p-3">
          <AdminNavLinks />
        </div>
        <Separator />
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            render={<Link href="/" />}
            nativeButton={false}
          >
            <IconBuildingStore data-icon="inline-start" />
            У магазин
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-12 items-center border-b bg-background px-4 lg:hidden">
          <h1 className="truncate text-base font-semibold">{current}</h1>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-8">
          <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {current}
            </h1>
          </div>
          {children}
        </main>
      </div>

      <nav
        aria-label="Адмінка"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="pointer-events-auto flex items-stretch gap-1 rounded-full border bg-card p-1 shadow-lg">
          {ADMIN_LINKS.filter((link) => isAdminPrimaryHref(link.href)).map(
            (link) => {
              const active = isAdminLinkActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={tap}
                  className={cn(
                    "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5" />
                  {link.label}
                </Link>
              );
            },
          )}
          <button
            type="button"
            onClick={() => {
              tap();
              setMoreOpen(true);
            }}
            className={cn(
              "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium",
              moreActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
            aria-label="Ще розділи"
          >
            <IconDots className="size-5" />
            Ще
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Розділи</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <AdminNavLinks
              only="secondary"
              onNavigate={() => setMoreOpen(false)}
            />
            <Separator />
            <Button
              variant="ghost"
              size="lg"
              className="h-12 justify-start"
              render={<Link href="/" />}
              nativeButton={false}
              onClick={() => setMoreOpen(false)}
            >
              <IconBuildingStore data-icon="inline-start" />
              У магазин
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
