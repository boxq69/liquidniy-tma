"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAdjustmentsHorizontal,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FiltersPanel } from "@/components/shop/FiltersPanel";
import { catalogHref } from "@/lib/catalog/params";
import type { ProductFilters } from "@/lib/types";

type HeaderProps = {
  banner?: string | null;
  href?: string;
  title?: string;
  showBanner?: boolean;
  filters?: ProductFilters;
};

export function Header({
  banner,
  href = "/",
  title = "LIQUIDNIY",
  showBanner = true,
  filters,
}: HeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const q = filters?.q ?? "";

  const go = (next: ProductFilters) => {
    const query = next.q || q || undefined;
    router.push(catalogHref({ ...next, q: query }));
    setOpen(false);
  };

  return (
    <header className="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
      {showBanner && banner ? (
        <Link
          href={href}
          className="relative block aspect-[2/1] w-full overflow-hidden rounded-2xl"
        >
          <Image
            src={banner}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        </Link>
      ) : null}

      <div className="flex items-center gap-2">
        <form
          role="search"
          className="relative min-w-0 flex-1"
          action="/catalog"
          method="get"
        >
          <label htmlFor="product-search" className="sr-only">
            Пошук товарів
          </label>
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="product-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Пошук товарів"
            className="h-11 w-full rounded-2xl border-0 bg-background pr-3 pl-10 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          <DrawerTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Фільтри"
                className="size-11 shrink-0 rounded-2xl"
              />
            }
          >
            <IconAdjustmentsHorizontal />
          </DrawerTrigger>

          <DrawerContent>
            <DrawerHeader className="relative items-center px-4 pt-2 pb-2 text-center md:text-center">
              <DrawerTitle className="w-full text-center text-base font-semibold">
                Фільтри
              </DrawerTitle>
              <DrawerClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Закрити"
                    className="absolute top-2 right-3"
                  />
                }
              >
                <IconX />
              </DrawerClose>
            </DrawerHeader>

            <FiltersPanel
              value={filters}
              onClear={() => go({})}
              onApply={(next) => go(next)}
            />
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  );
}

export default Header;
