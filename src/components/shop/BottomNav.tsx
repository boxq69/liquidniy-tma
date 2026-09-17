"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHeart,
  IconList,
  IconShoppingCart,
  IconUser,
} from "@tabler/icons-react";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/utils/app";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);

  if (
    pathname.startsWith("/product/") ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/profile/orders/") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  const totalUah = items.reduce((sum, item) => sum + item.priceUah * item.qty, 0);

  const iconClass =
    "inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/10";

  return (
    <nav
      aria-label="Нижня навігація"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex w-full items-center gap-2">
        <div
          className={cn(
            "flex flex-1 items-center justify-around rounded-full border border-white/10",
            "bg-card px-2 py-1.5 shadow-lg",
          )}
        >
          <Link
            href="/"
            className={cn(iconClass, (pathname === "/" || pathname.startsWith("/catalog")) && "bg-foreground/10")}
            aria-current={pathname === "/" || pathname.startsWith("/catalog") ? "page" : undefined}
            aria-label="Каталог"
          >
            <IconList className="size-5" />
          </Link>
          <Link
            href="/favorites"
            className={cn(
              iconClass,
              pathname.startsWith("/favorites") && "bg-foreground/10",
            )}
            aria-current={pathname.startsWith("/favorites") ? "page" : undefined}
            aria-label="Обране"
          >
            <IconHeart className="size-5" />
          </Link>
          <Link
            href="/profile"
            className={cn(
              iconClass,
              pathname.startsWith("/profile") && "bg-foreground/10",
            )}
            aria-current={pathname.startsWith("/profile") ? "page" : undefined}
            aria-label="Профіль"
          >
            <IconUser className="size-5" />
          </Link>
        </div>

        <Link
          href="/cart"
          className={cn(
            "inline-flex h-14 min-w-[9.5rem] items-center justify-between gap-3 rounded-full",
            "border border-white/10 bg-card p-1.5 shadow-lg",
          )}
          aria-label="Кошик"
        >
          <span className="inline-flex h-full flex-1 items-center justify-between gap-2 rounded-full bg-primary px-4 text-primary-foreground">
            <IconShoppingCart className="size-5 shrink-0" />
            <span className="text-sm font-semibold tabular-nums">
              {formatPrice(totalUah)}
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
