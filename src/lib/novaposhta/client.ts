const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";

export type NpSettlement = {
  ref: string;
  name: string;
  area: string;
  region: string;
};

export type NpWarehouse = {
  ref: string;
  number: string;
  description: string;
  shortAddress: string;
  cityRef: string;
  category: "Warehouse" | "Postomat" | "Store" | "Other";
};

export type NpSource = "nova-poshta" | "mock" | "none";

type NpResponse<T> = {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  info?: unknown;
};

type NpMode = "auto" | "live" | "mock";

function getMode(): NpMode {
  const raw = (process.env.NOVA_POSHTA_MODE ?? "auto").trim().toLowerCase();
  if (raw === "live" || raw === "mock" || raw === "auto") return raw;
  return "auto";
}

function getNovaPoshtaApiKey(): string {
  const raw = process.env.NOVA_POSHTA_API_KEY?.trim() ?? "";
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  if (lowered === "test" || lowered === "demo" || lowered === "mock") {
    return "";
  }
  return raw;
}

export function shouldUseNovaPoshtaApi() {
  return getMode() !== "mock";
}

function isIncorrectApiKeyError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("api key incorrect") ||
    m.includes("api key is invalid") ||
    m.includes("невірний ключ") ||
    m.includes("неверный ключ")
  );
}

async function npRequestOnce<T>(
  apiKey: string,
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, string>,
): Promise<T[]> {
  const res = await fetch(NP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      modelName,
      calledMethod,
      methodProperties,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nova Poshta HTTP ${res.status}`);
  }

  const json = (await res.json()) as NpResponse<T>;
  if (!json.success) {
    const msg = json.errors?.[0] ?? "Nova Poshta request failed";
    throw new Error(msg);
  }

  return json.data ?? [];
}

async function npRequest<T>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, string>,
): Promise<T[]> {
  const apiKey = getNovaPoshtaApiKey();
  try {
    return await npRequestOnce<T>(
      apiKey,
      modelName,
      calledMethod,
      methodProperties,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (apiKey && isIncorrectApiKeyError(message)) {
      return npRequestOnce<T>("", modelName, calledMethod, methodProperties);
    }
    throw err;
  }
}

type SettlementRaw = {
  TotalCount: string;
  Addresses: Array<{
    Present: string;
    DeliveryCity: string;
    MainDescription: string;
    Area: string;
    Region: string;
  }>;
};

export async function searchSettlements(query: string, limit = 20) {
  const q = query.trim();
  if (q.length < 2) return [] as NpSettlement[];

  const data = await npRequest<SettlementRaw>("Address", "searchSettlements", {
    CityName: q,
    Limit: String(limit),
  });

  const first = data[0];
  if (!first?.Addresses?.length) return [];

  return first.Addresses.map((a) => ({
    ref: a.DeliveryCity,
    name: a.MainDescription,
    area: a.Area,
    region: a.Region,
  }));
}

type WarehouseRaw = {
  Ref: string;
  Number: string;
  Description: string;
  ShortAddress: string;
  CityRef: string;
  CategoryOfWarehouse: string;
};

function mapWarehouseCategory(category: string): NpWarehouse["category"] {
  if (category === "Postomat") return "Postomat";
  if (category === "Store") return "Store";
  if (category === "Warehouse") return "Warehouse";
  return "Other";
}

export async function searchWarehouses(opts: {
  cityRef: string;
  query?: string;
  limit?: number;
  page?: number;
}) {
  const cityRef = opts.cityRef.trim();
  if (!cityRef) return [] as NpWarehouse[];

  const props: Record<string, string> = {
    CityRef: cityRef,
    Limit: String(opts.limit ?? 50),
    Page: String(opts.page ?? 1),
    Language: "UA",
  };

  const q = opts.query?.trim();
  if (q) props.FindByString = q;

  const data = await npRequest<WarehouseRaw>(
    "AddressGeneral",
    "getWarehouses",
    props,
  );

  return data.map((w) => ({
    ref: w.Ref,
    number: w.Number,
    description: w.Description,
    shortAddress: w.ShortAddress,
    cityRef: w.CityRef,
    category: mapWarehouseCategory(w.CategoryOfWarehouse),
  }));
}
