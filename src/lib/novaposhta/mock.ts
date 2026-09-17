import type { NpSettlement, NpWarehouse } from "@/lib/novaposhta/client";

const MOCK_SETTLEMENTS: NpSettlement[] = [
  {
    ref: "8d5a980d-391c-11dd-90d9-001a92567626",
    name: "Київ",
    area: "Київська",
    region: "",
  },
  {
    ref: "db5c88e0-391c-11dd-90d9-001a92567626",
    name: "Львів",
    area: "Львівська",
    region: "",
  },
  {
    ref: "db5c88f0-391c-11dd-90d9-001a92567626",
    name: "Одеса",
    area: "Одеська",
    region: "",
  },
  {
    ref: "db5c88de-391c-11dd-90d9-001a92567626",
    name: "Харків",
    area: "Харківська",
    region: "",
  },
  {
    ref: "db5c88e4-391c-11dd-90d9-001a92567626",
    name: "Дніпро",
    area: "Дніпропетровська",
    region: "",
  },
];

const MOCK_WAREHOUSES: Record<string, NpWarehouse[]> = {
  "8d5a980d-391c-11dd-90d9-001a92567626": [
    {
      ref: "mock-kyiv-1",
      number: "1",
      description: "Відділення №1: вул. Пирогівський шлях, 135",
      shortAddress: "вул. Пирогівський шлях, 135",
      cityRef: "8d5a980d-391c-11dd-90d9-001a92567626",
      category: "Warehouse",
    },
    {
      ref: "mock-kyiv-2",
      number: "2",
      description: "Відділення №2: вул. Калачівська, 13",
      shortAddress: "вул. Калачівська, 13",
      cityRef: "8d5a980d-391c-11dd-90d9-001a92567626",
      category: "Warehouse",
    },
    {
      ref: "mock-kyiv-pm-1",
      number: "5001",
      description: "Поштомат №5001: ТРЦ Ocean Plaza",
      shortAddress: "вул. Антоновича, 176",
      cityRef: "8d5a980d-391c-11dd-90d9-001a92567626",
      category: "Postomat",
    },
  ],
  "db5c88e0-391c-11dd-90d9-001a92567626": [
    {
      ref: "mock-lviv-1",
      number: "1",
      description: "Відділення №1: вул. Городоцька, 179",
      shortAddress: "вул. Городоцька, 179",
      cityRef: "db5c88e0-391c-11dd-90d9-001a92567626",
      category: "Warehouse",
    },
    {
      ref: "mock-lviv-5",
      number: "5",
      description: "Відділення №5: пр. Червоної Калини, 60",
      shortAddress: "пр. Червоної Калини, 60",
      cityRef: "db5c88e0-391c-11dd-90d9-001a92567626",
      category: "Warehouse",
    },
  ],
};

function matchesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export function mockSearchSettlements(query: string): NpSettlement[] {
  const q = query.trim();
  if (q.length < 2) return [];
  return MOCK_SETTLEMENTS.filter((s) => matchesQuery(s.name, q));
}

export function mockSearchWarehouses(
  cityRef: string,
  query?: string,
): NpWarehouse[] {
  const list = MOCK_WAREHOUSES[cityRef] ?? [
    {
      ref: `mock-${cityRef}-1`,
      number: "1",
      description: "Відділення №1 (демо)",
      shortAddress: "вул. Демонстраційна, 1",
      cityRef,
      category: "Warehouse" as const,
    },
    {
      ref: `mock-${cityRef}-2`,
      number: "2",
      description: "Відділення №2 (демо)",
      shortAddress: "вул. Демонстраційна, 2",
      cityRef,
      category: "Warehouse" as const,
    },
  ];

  const q = query?.trim();
  if (!q) return list;
  return list.filter(
    (w) =>
      matchesQuery(w.description, q) ||
      matchesQuery(w.number, q) ||
      matchesQuery(w.shortAddress, q),
  );
}
