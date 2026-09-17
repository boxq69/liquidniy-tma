"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { catalogSearchParams, PRODUCT_SORTS } from "@/lib/catalog/params";
import type { CatalogFilterMeta, ProductFilters, ProductSort } from "@/lib/types";

type Draft = {
  sort: ProductSort;
  inStockOnly: boolean;
  featured: boolean;
  priceFrom: number;
  priceTo: number;
  category: string;
  sizes: string[];
  colors: string[];
};

function toggleValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-w-12 rounded-xl border px-3 py-2 text-sm transition-colors",
        selected
          ? "border-primary bg-transparent text-foreground"
          : "border-transparent bg-muted text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function draftFromFilters(filters: ProductFilters, meta: CatalogFilterMeta): Draft {
  return {
    sort: filters.sort ?? "relevance",
    inStockOnly: Boolean(filters.inStock),
    featured: Boolean(filters.featured),
    priceFrom: filters.minPrice ?? meta.minPrice,
    priceTo: filters.maxPrice ?? meta.maxPrice,
    category: filters.category ?? "",
    sizes: filters.sizes ?? (filters.size ? [filters.size] : []),
    colors: filters.colors ?? (filters.color ? [filters.color] : []),
  };
}

export function FiltersPanel({
  value,
  onClear,
  onApply,
}: {
  value?: ProductFilters;
  onClear?: () => void;
  onApply?: (filters: ProductFilters) => void;
}) {
  const [meta, setMeta] = useState<CatalogFilterMeta | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filterKey = catalogSearchParams(value ?? {}).toString();

  useEffect(() => {
    let cancelled = false;
    void api
      .productFilters()
      .then((next) => {
        if (cancelled) return;
        setMeta(next);
        setDraft(draftFromFilters(value ?? {}, next));
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey captures value
  }, [filterKey]);

  const sortItems = useMemo(
    () => PRODUCT_SORTS.map((item) => ({ label: item.label, value: item.value })),
    [],
  );

  if (!meta || !draft) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const toFilters = (): ProductFilters => {
    const fullRange =
      draft.priceFrom <= meta.minPrice && draft.priceTo >= meta.maxPrice;
    return {
      sort: draft.sort,
      inStock: draft.inStockOnly || undefined,
      featured: draft.featured || undefined,
      category: draft.category || undefined,
      sizes: draft.sizes.length ? draft.sizes : undefined,
      colors: draft.colors.length ? draft.colors : undefined,
      minPrice: fullRange ? undefined : draft.priceFrom,
      maxPrice: fullRange ? undefined : draft.priceTo,
    };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2 touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel className="sr-only">Сортування</FieldLabel>
            <Select
              items={sortItems}
              value={draft.sort}
              onValueChange={(next) => {
                if (typeof next === "string") {
                  setDraft((prev) =>
                    prev ? { ...prev, sort: next as ProductSort } : prev,
                  );
                }
              }}
            >
              <SelectTrigger
                aria-label="Сортування"
                className="h-12 w-full justify-start rounded-2xl px-3"
              >
                <IconAdjustmentsHorizontal data-icon="inline-start" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                <SelectGroup>
                  {sortItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="filter-stock">Лише в наявності</FieldLabel>
            <Switch
              id="filter-stock"
              checked={draft.inStockOnly}
              onCheckedChange={(checked) =>
                setDraft((prev) =>
                  prev ? { ...prev, inStockOnly: Boolean(checked) } : prev,
                )
              }
            />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="filter-featured">Бестселери</FieldLabel>
            <Switch
              id="filter-featured"
              checked={draft.featured}
              onCheckedChange={(checked) =>
                setDraft((prev) =>
                  prev ? { ...prev, featured: Boolean(checked) } : prev,
                )
              }
            />
          </Field>

          {meta.categories.length ? (
            <Field>
              <FieldLabel>Категорія</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Усі"
                  selected={!draft.category}
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, category: "" } : prev))
                  }
                />
                {meta.categories.map((category) => (
                  <Chip
                    key={category.slug}
                    label={category.name}
                    selected={draft.category === category.slug}
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              category:
                                prev.category === category.slug
                                  ? ""
                                  : category.slug,
                            }
                          : prev,
                      )
                    }
                  />
                ))}
              </div>
            </Field>
          ) : null}

          <Field>
            <FieldLabel>Ціна, грн</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={meta.minPrice}
                max={draft.priceTo}
                value={draft.priceFrom}
                onChange={(event) => {
                  const next = Math.min(
                    Number(event.target.value) || meta.minPrice,
                    draft.priceTo,
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, priceFrom: next } : prev,
                  );
                }}
                aria-label="Ціна від"
              />
              <Input
                type="number"
                inputMode="numeric"
                min={draft.priceFrom}
                max={meta.maxPrice}
                value={draft.priceTo}
                onChange={(event) => {
                  const next = Math.max(
                    Number(event.target.value) || meta.maxPrice,
                    draft.priceFrom,
                  );
                  setDraft((prev) => (prev ? { ...prev, priceTo: next } : prev));
                }}
                aria-label="Ціна до"
              />
            </div>
          </Field>

          {meta.clothingSizes.length ? (
            <Field>
              <FieldLabel>Одяг</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {meta.clothingSizes.map((size) => (
                  <Chip
                    key={size}
                    label={size}
                    selected={draft.sizes.includes(size)}
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, sizes: toggleValue(prev.sizes, size) }
                          : prev,
                      )
                    }
                  />
                ))}
              </div>
            </Field>
          ) : null}

          {meta.shoeSizes.length ? (
            <Field>
              <FieldLabel>Взуття</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {meta.shoeSizes.map((size) => (
                  <Chip
                    key={size}
                    label={size}
                    selected={draft.sizes.includes(size)}
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, sizes: toggleValue(prev.sizes, size) }
                          : prev,
                      )
                    }
                  />
                ))}
              </div>
            </Field>
          ) : null}

          {meta.otherSizes.length ? (
            <Field>
              <FieldLabel>Інший розмір</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {meta.otherSizes.map((size) => (
                  <Chip
                    key={size}
                    label={size}
                    selected={draft.sizes.includes(size)}
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, sizes: toggleValue(prev.sizes, size) }
                          : prev,
                      )
                    }
                  />
                ))}
              </div>
            </Field>
          ) : null}

          {meta.colors.length ? (
            <Field>
              <FieldLabel>Колір</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {meta.colors.map((color) => (
                  <label key={color} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.colors.includes(color)}
                      onCheckedChange={() =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                colors: toggleValue(prev.colors, color),
                              }
                            : prev,
                        )
                      }
                    />
                    {color}
                  </label>
                ))}
              </div>
            </Field>
          ) : null}
        </FieldGroup>
      </div>

      <div className="flex shrink-0 gap-3 p-4 pt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDraft(draftFromFilters({}, meta));
            onClear?.();
          }}
          className="h-12 flex-1 rounded-full"
        >
          Скинути
        </Button>
        <Button
          type="button"
          onClick={() => onApply?.(toFilters())}
          className="h-12 flex-1 rounded-full"
        >
          Показати
        </Button>
      </div>
    </div>
  );
}
