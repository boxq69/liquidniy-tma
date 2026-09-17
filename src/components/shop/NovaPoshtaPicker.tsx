"use client";

import { useEffect, useState } from "react";
import {
  IconBuildingStore,
  IconCheck,
  IconChevronRight,
  IconMapPin,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NpSettlement, NpWarehouse } from "@/lib/novaposhta/client";

export type NovaPoshtaSelection = {
  cityRef: string;
  cityName: string;
  cityArea: string;
  warehouseRef: string;
  warehouseNumber: string;
  warehouseDescription: string;
  warehouseAddress: string;
  warehouseCategory: NpWarehouse["category"];
};

type Step = "city" | "warehouse";

type NovaPoshtaPickerProps = {
  value: NovaPoshtaSelection | null;
  onChange: (value: NovaPoshtaSelection | null) => void;
  error?: string;
};

function categoryLabel(category: NpWarehouse["category"]) {
  if (category === "Postomat") return "Поштомат";
  if (category === "Store") return "Пункт";
  return "Відділення";
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function NovaPoshtaPicker({
  value,
  onChange,
  error,
}: NovaPoshtaPickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("city");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);

  const [cityDraft, setCityDraft] = useState<NpSettlement | null>(null);
  const [citySearch, setCitySearch] = useState<{
    q: string;
    items: NpSettlement[];
  } | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState<{
    cityRef: string;
    q: string;
    items: NpWarehouse[];
  } | null>(null);
  const [source, setSource] = useState<"mock" | "nova-poshta" | "none">("none");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const cityQuery = debouncedQuery.trim();
  const warehouseQuery = debouncedQuery.trim();
  const cityReady = open && step === "city" && cityQuery.length >= 2;
  const warehouseReady = open && step === "warehouse" && Boolean(cityDraft?.ref);
  const loading =
    (cityReady && citySearch?.q !== cityQuery) ||
    (warehouseReady &&
      (warehouseSearch?.cityRef !== cityDraft?.ref ||
        warehouseSearch?.q !== warehouseQuery));
  const settlements =
    cityReady && citySearch?.q === cityQuery ? citySearch.items : [];
  const warehouses =
    warehouseReady &&
    warehouseSearch?.cityRef === cityDraft?.ref &&
    warehouseSearch?.q === warehouseQuery
      ? warehouseSearch.items
      : [];

  const summary = value
    ? `${value.cityName} · №${value.warehouseNumber}`
    : null;

  const openPicker = () => {
    setStep(value ? "warehouse" : "city");
    setCityDraft(
      value
        ? {
            ref: value.cityRef,
            name: value.cityName,
            area: value.cityArea,
            region: "",
          }
        : null,
    );
    setQuery("");
    setCitySearch(null);
    setWarehouseSearch(null);
    setFetchError(null);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || step !== "city") return;
    const q = debouncedQuery.trim();
    if (q.length < 2) return;

    let cancelled = false;
    fetch(`/api/np/settlements?q=${encodeURIComponent(q)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          items?: NpSettlement[];
          source?: "mock" | "nova-poshta" | "none";
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Помилка пошуку");
        if (cancelled) return;
        setCitySearch({ q, items: data.items ?? [] });
        setSource(data.source ?? "none");
        setFetchError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCitySearch({ q, items: [] });
        setFetchError(err instanceof Error ? err.message : "Помилка пошуку");
      });

    return () => {
      cancelled = true;
    };
  }, [open, step, debouncedQuery]);

  useEffect(() => {
    if (!open || step !== "warehouse" || !cityDraft?.ref) return;

    const q = debouncedQuery.trim();
    const cityRef = cityDraft.ref;
    let cancelled = false;
    const params = new URLSearchParams({ cityRef });
    if (q) params.set("q", q);

    fetch(`/api/np/warehouses?${params}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          items?: NpWarehouse[];
          source?: "mock" | "nova-poshta" | "none";
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Помилка пошуку");
        if (cancelled) return;
        setWarehouseSearch({ cityRef, q, items: data.items ?? [] });
        setSource(data.source ?? "none");
        setFetchError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWarehouseSearch({ cityRef, q, items: [] });
        setFetchError(err instanceof Error ? err.message : "Помилка пошуку");
      });

    return () => {
      cancelled = true;
    };
  }, [open, step, cityDraft?.ref, debouncedQuery]);

  const selectCity = (city: NpSettlement) => {
    setCityDraft(city);
    setQuery("");
    setWarehouseSearch(null);
    setStep("warehouse");
  };

  const selectWarehouse = (warehouse: NpWarehouse) => {
    if (!cityDraft) return;
    onChange({
      cityRef: cityDraft.ref,
      cityName: cityDraft.name,
      cityArea: cityDraft.area,
      warehouseRef: warehouse.ref,
      warehouseNumber: warehouse.number,
      warehouseDescription: warehouse.description,
      warehouseAddress: warehouse.shortAddress,
      warehouseCategory: warehouse.category,
    });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl bg-card px-3 py-3.5 text-left",
          error && "ring-1 ring-destructive",
        )}
      >
        <IconMapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          {summary ? (
            <>
              <span className="block text-sm font-medium">{summary}</span>
              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                {value?.warehouseDescription}
              </span>
            </>
          ) : (
            <span className="block text-sm text-muted-foreground">
              Місто та відділення Нової Пошти
            </span>
          )}
        </span>
        <IconChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Drawer
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        showSwipeHandle
      >
        <DrawerContent>
          <DrawerHeader className="relative items-center px-4 pt-2 pb-2 text-center md:text-center">
            <DrawerTitle className="w-full text-center text-base font-semibold">
              {step === "city" ? "Оберіть місто" : "Оберіть відділення"}
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

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
            {step === "warehouse" && cityDraft ? (
              <button
                type="button"
                onClick={() => {
                  setStep("city");
                  setQuery("");
                  setCitySearch(null);
                }}
                className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-left text-sm"
              >
                <IconBuildingStore className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {cityDraft.name}
                  {cityDraft.area ? `, ${cityDraft.area}` : ""}
                </span>
                <span className="text-xs text-primary">Змінити</span>
              </button>
            ) : null}

            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  step === "city"
                    ? "Пошук міста…"
                    : "Номер або вулиця відділення…"
                }
                className="h-11 rounded-xl pl-9"
                autoFocus
              />
            </div>

            {source === "mock" ? (
              <p className="text-xs text-muted-foreground">Демо-довідник</p>
            ) : source === "nova-poshta" ? (
              <p className="text-xs text-muted-foreground">
                Дані з API Нової Пошти
              </p>
            ) : null}

            {fetchError ? (
              <p className="text-xs text-destructive">{fetchError}</p>
            ) : null}

            <ul className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-card">
              {loading ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Шукаємо…
                </li>
              ) : null}

              {!loading &&
              step === "city" &&
              debouncedQuery.trim().length < 2 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Введіть щонайменше 2 літери
                </li>
              ) : null}

              {!loading &&
              step === "city" &&
              debouncedQuery.trim().length >= 2 &&
              settlements.length === 0 &&
              !fetchError ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Нічого не знайдено
                </li>
              ) : null}

              {!loading &&
              step === "warehouse" &&
              warehouses.length === 0 &&
              !fetchError ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Відділень не знайдено
                </li>
              ) : null}

              {step === "city"
                ? settlements.map((city) => (
                    <li key={`${city.ref}-${city.name}`}>
                      <button
                        type="button"
                        onClick={() => selectCity(city)}
                        className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left last:border-b-0"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {city.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {[city.area, city.region].filter(Boolean).join(", ")}
                          </span>
                        </span>
                        <IconChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))
                : warehouses.map((wh) => {
                    const selected = value?.warehouseRef === wh.ref;
                    return (
                      <li key={wh.ref}>
                        <button
                          type="button"
                          onClick={() => selectWarehouse(wh)}
                          className="flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left last:border-b-0"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {categoryLabel(wh.category)}
                              </span>
                              №{wh.number}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                              {wh.description}
                            </span>
                          </span>
                          {selected ? (
                            <IconCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
            </ul>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
