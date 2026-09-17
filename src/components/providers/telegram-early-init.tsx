"use client";

import { useLayoutEffect } from "react";
import { captureTelegramHash, ensureTelegramWebAppScript } from "@/lib/telegram/webapp-client";

export function TelegramEarlyInit() {
  useLayoutEffect(() => {
    captureTelegramHash();
    void ensureTelegramWebAppScript();
  }, []);

  return null;
}
