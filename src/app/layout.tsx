import type { Metadata, Viewport } from "next";
import { Unbounded, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TelegramAuthProvider } from "@/components/providers/telegram-auth-bootstrap";
import { TelegramBackButton } from "@/components/providers/telegram-back-button";
import { TelegramEarlyInit } from "@/components/providers/telegram-early-init";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { TelegramSafeArea } from "@/components/providers/telegram-safe-area";
import { BottomNav } from "@/components/shop/BottomNav";
import { AppShell } from "@/components/providers/app-shell";
import "./globals.css";
import { cn } from "@/lib/utils";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIQUIDNIY",
  description: "Мультибрендовий магазин преміум одягу.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      suppressHydrationWarning
      className={cn(
        "dark min-h-full overflow-x-hidden antialiased font-sans",
        unbounded.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full w-full overflow-x-hidden bg-background text-foreground">
        <TelegramEarlyInit />
        <TelegramProvider>
          <TelegramAuthProvider>
            <TelegramSafeArea />
            <TelegramBackButton />
            <AppShell>{children}</AppShell>
            <BottomNav />
            <Toaster />
          </TelegramAuthProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
