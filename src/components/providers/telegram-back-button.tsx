"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  bindBackButtonResync,
  navigateWhenReady,
  setTelegramBackButtonVisible,
  subscribeTelegramBackButton,
  waitForTelegramWebApp,
} from "@/lib/telegram/webapp-client";

function parentPath(pathname: string) {
  if (pathname === "/catalog") return "/";
  if (pathname.startsWith("/product/")) return "/";
  if (pathname === "/checkout") return "/cart";
  if (pathname === "/cart") return "/";
  if (pathname.startsWith("/profile/orders/")) return "/profile";
  if (pathname === "/profile" || pathname === "/favorites") return "/";
  if (pathname.startsWith("/admin/orders/")) return "/admin/orders";
  if (pathname === "/admin" || pathname === "/admin/") return "/";
  if (pathname.startsWith("/admin/")) return "/admin";
  return "/";
}

function canGoBackInApp() {
  const state = window.history.state as { idx?: number } | null;
  if (state && typeof state.idx === "number") return state.idx > 0;
  return window.history.length > 2;
}

export function TelegramBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  useEffect(() => {
    void waitForTelegramWebApp().then((wa) => {
      if (!wa) return;
      bindBackButtonResync();
      setTelegramBackButtonVisible(pathnameRef.current !== "/");
    });
  }, [pathname]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void waitForTelegramWebApp().then((wa) => {
      if (!wa) return;
      unsubscribe = subscribeTelegramBackButton(() => {
        wa.HapticFeedback?.impactOccurred("light");
        const path = pathnameRef.current;
        if (path === "/") return;
        navigateWhenReady(() => {
          if (canGoBackInApp()) {
            routerRef.current.back();
            return;
          }
          routerRef.current.replace(parentPath(path));
        });
      });
    });

    return () => unsubscribe?.();
  }, []);

  return null;
}
