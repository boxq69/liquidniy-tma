"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div
      className={cn(
        "min-h-full w-full",
        isAdmin
          ? "max-w-none"
          : "mx-auto max-w-md overflow-x-hidden pb-28",
      )}
    >
      {children}
    </div>
  );
}
