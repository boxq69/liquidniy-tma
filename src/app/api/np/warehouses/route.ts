import { NextResponse } from "next/server";
import {
  searchWarehouses,
  shouldUseNovaPoshtaApi,
} from "@/lib/novaposhta/client";
import { mockSearchWarehouses } from "@/lib/novaposhta/mock";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityRef = (searchParams.get("cityRef") ?? "").trim();
    const q = (searchParams.get("q") ?? "").trim();

    if (!cityRef) {
      return NextResponse.json(
        { error: "cityRef required" },
        { status: 400 },
      );
    }

    if (!shouldUseNovaPoshtaApi()) {
      return NextResponse.json({
        items: mockSearchWarehouses(cityRef, q || undefined),
        source: "mock",
      });
    }

    const items = await searchWarehouses({
      cityRef,
      query: q || undefined,
      limit: 50,
    });
    return NextResponse.json({ items, source: "nova-poshta" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
