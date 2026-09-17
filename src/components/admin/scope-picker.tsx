"use client";

import { useMemo, useState } from "react";
import type { AppliesTo, Category, ProductWithDetails } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ScopePicker({
  appliesTo,
  onAppliesToChange,
  productIds,
  categoryIds,
  onProductIdsChange,
  onCategoryIdsChange,
  products,
  categories,
}: {
  appliesTo: AppliesTo;
  onAppliesToChange: (value: AppliesTo) => void;
  productIds: string[];
  categoryIds: string[];
  onProductIdsChange: (ids: string[]) => void;
  onCategoryIdsChange: (ids: string[]) => void;
  products: ProductWithDetails[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      `${product.title} ${product.slug}`.toLowerCase().includes(q),
    );
  }, [products, query]);

  const toggle = (ids: string[], id: string, onChange: (next: string[]) => void) => {
    onChange(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>На що діє</FieldLabel>
        <ToggleGroup
          value={[appliesTo]}
          onValueChange={(value) => {
            const next = value[0] as AppliesTo | undefined;
            if (next) onAppliesToChange(next);
          }}
          spacing={2}
        >
          <ToggleGroupItem value="all">Увесь каталог</ToggleGroupItem>
          <ToggleGroupItem value="categories">Категорії</ToggleGroupItem>
          <ToggleGroupItem value="products">Товари</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      {appliesTo === "categories" ? (
        <FieldSet>
          <FieldLegend variant="label">Категорії</FieldLegend>
          <FieldDescription>Знижка застосується до товарів цих категорій.</FieldDescription>
          <FieldGroup className="gap-3">
            {categories.map((category) => (
              <Field key={category.id} orientation="horizontal">
                <Checkbox
                  id={`scope-cat-${category.id}`}
                  checked={categoryIds.includes(category.id)}
                  onCheckedChange={() =>
                    toggle(categoryIds, category.id, onCategoryIdsChange)
                  }
                />
                <FieldLabel htmlFor={`scope-cat-${category.id}`} className="font-normal">
                  {category.name}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        </FieldSet>
      ) : null}

      {appliesTo === "products" ? (
        <FieldSet>
          <FieldLegend variant="label">Товари</FieldLegend>
          <FieldDescription>Пошук і вибір конкретних позицій.</FieldDescription>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук товару"
          />
          <FieldGroup className="max-h-56 gap-3 overflow-y-auto">
            {filteredProducts.map((product) => (
              <Field key={product.id} orientation="horizontal">
                <Checkbox
                  id={`scope-product-${product.id}`}
                  checked={productIds.includes(product.id)}
                  onCheckedChange={() =>
                    toggle(productIds, product.id, onProductIdsChange)
                  }
                />
                <FieldLabel
                  htmlFor={`scope-product-${product.id}`}
                  className="font-normal"
                >
                  {product.title}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        </FieldSet>
      ) : null}
    </FieldGroup>
  );
}
