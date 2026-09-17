import { NextResponse } from "next/server";
import {
  searchSettlements,
  shouldUseNovaPoshtaApi,
} from "@/lib/novaposhta/client";
import { mockSearchSettlements } from "@/lib/novaposhta/mock";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return NextResponse.json({ items: [], source: "none" });
    }

    if (!shouldUseNovaPoshtaApi()) {
      return NextResponse.json({
        items: mockSearchSettlements(q),
        source: "mock",
      });
    }

    const items = await searchSettlements(q);
    return NextResponse.json({ items, source: "nova-poshta" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
