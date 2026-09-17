"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { Category, ProductWithDetails } from "@/lib/types";
import type { ProductInput } from "@/lib/validations/schemas";
import { formatPrice, slugify } from "@/lib/utils/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminFormPanel } from "@/components/admin/form-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VariantDraft = {
  size: string;
  color: string;
  priceUah: string;
  stock: string;
  sku: string;
};

const emptyVariant = (): VariantDraft => ({
  size: "M",
  color: "Чорний",
  priceUah: "0",
  stock: "0",
  sku: "",
});

export function AdminProductsView() {
  const [items, setItems] = useState<ProductWithDetails[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ProductWithDetails | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductWithDetails | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);

  const load = async () => {
    const [{ items: products }, { items: cats }] = await Promise.all([
      api.admin.products.list(),
      api.admin.categories.list(),
    ]);
    setItems(products);
    setCategories(cats);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.admin.products.list(), api.admin.categories.list()])
      .then(([{ items: products }, { items: cats }]) => {
        if (cancelled) return;
        setItems(products);
        setCategories(cats);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiRequestError ? err.message : "Не вдалося завантажити",
        );
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((product) => {
      if (categoryFilter !== "all" && product.category_id !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return `${product.title} ${product.slug} ${product.category?.name ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, categoryFilter]);

  const fillForm = (product: ProductWithDetails | null) => {
    setEditing(product);
    setTitle(product?.title ?? "");
    setSlug(product?.slug ?? "");
    setDescription(product?.description ?? "");
    setCategoryId(product?.category_id ?? null);
    setIsActive(product?.is_active ?? true);
    setIsFeatured(product?.is_featured ?? false);
    setImageUrls((product?.images ?? []).map((image) => image.url));
    setVariants(
      product?.variants.length
        ? product.variants.map((variant) => ({
            size: variant.size,
            color: variant.color,
            priceUah: String(variant.price_uah),
            stock: String(variant.stock),
            sku: variant.sku ?? "",
          }))
        : [emptyVariant()],
    );
    setOpen(true);
  };

  const toPayload = (): ProductInput => ({
    title,
    slug: slug || slugify(title),
    description,
    categoryId,
    isActive,
    isFeatured,
    sortOrder: editing?.sort_order ?? 0,
    imageUrls,
    variants: variants.map((variant) => ({
      size: variant.size.trim(),
      color: variant.color.trim(),
      priceUah: Number(variant.priceUah) || 0,
      stock: Number(variant.stock) || 0,
      sku: variant.sku.trim() || null,
    })),
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload = toPayload();
      if (editing) {
        await api.admin.products.update(editing.id, payload);
      } else {
        await api.admin.products.create(payload);
      }
      await load();
      setOpen(false);
      toast.success(editing ? "Товар оновлено" : "Товар створено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося зберегти",
      );
    } finally {
      setSaving(false);
    }
  };

  const patchFlags = async (
    product: ProductWithDetails,
    input: Partial<ProductInput>,
  ) => {
    try {
      await api.admin.products.update(product.id, input);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося оновити",
      );
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api.admin.products.remove(pendingDelete.id);
      await load();
      setPendingDelete(null);
      toast.success("Товар видалено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося видалити",
      );
    }
  };

  const upload = async (file: File) => {
    try {
      const { url } = await api.admin.uploadImage(file);
      setImageUrls((prev) => [...prev, url]);
      toast.success("Фото завантажено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося завантажити фото",
      );
    }
  };

  const categoryItems = [
    { value: "none", label: "Без категорії" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];
  const filterItems = [
    { value: "all", label: "Усі категорії" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Пошук товарів"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          items={filterItems}
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(String(value ?? "all"))}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {filterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => fillForm(null)}>
        <IconPlus data-icon="inline-start" />
        Додати товар
      </Button>
    </div>
  );

  const stockTotal = (product: ProductWithDetails) =>
    product.variants.reduce((sum, variant) => sum + variant.stock, 0);

  return (
    <div className="flex flex-col gap-4">
      {toolbar}

      {items == null ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPlus />
            </EmptyMedia>
            <EmptyTitle>Товарів немає</EmptyTitle>
            <EmptyDescription>
              Додайте першу позицію або змініть фільтр пошуку.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>Категорія</TableHead>
                  <TableHead>Ціна</TableHead>
                  <TableHead>Сток</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => fillForm(product)}
                      >
                        <span className="relative block size-12 overflow-hidden rounded-lg bg-muted">
                          {product.images[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0].url}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : null}
                        </span>
                        <span>
                          <span className="block font-medium">{product.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {product.slug}
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>{product.category?.name ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {product.min_price != null
                        ? formatPrice(product.sale_price ?? product.min_price)
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {stockTotal(product)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.is_active ? (
                          <Badge variant="secondary">В магазині</Badge>
                        ) : (
                          <Badge variant="outline">Прихований</Badge>
                        )}
                        {product.is_featured ? (
                          <Badge>Хіт</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => fillForm(product)}>
                          Редагувати
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Видалити"
                          onClick={() => setPendingDelete(product)}
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map((product) => (
              <Card key={product.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => fillForm(product)}
                    >
                      {product.title}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Видалити"
                      onClick={() => setPendingDelete(product)}
                    >
                      <IconTrash />
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    {product.category?.name ?? "Без категорії"}
                    {product.min_price != null
                      ? ` · ${formatPrice(product.sale_price ?? product.min_price)}`
                      : null}
                    {!product.is_active ? (
                      <Badge variant="outline">Прихований</Badge>
                    ) : null}
                    {product.is_featured ? (
                      <Badge variant="secondary">Хіт</Badge>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Field orientation="horizontal">
                    <FieldLabel>Активний у магазині</FieldLabel>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={(checked) =>
                        void patchFlags(product, { isActive: checked })
                      }
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel>Хіт на головній</FieldLabel>
                    <Switch
                      checked={product.is_featured}
                      onCheckedChange={(checked) =>
                        void patchFlags(product, { isFeatured: checked })
                      }
                    />
                  </Field>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <AdminFormPanel
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Редагувати товар" : "Новий товар"}
        description="Назва, фото, варіанти розміру/кольору та наявність."
        wide
        footer={
          <Button onClick={() => void save()} disabled={saving || title.length < 2}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            Зберегти
          </Button>
        }
      >
        <FieldGroup>
              <Field>
                <FieldLabel htmlFor="product-title">Назва</FieldLabel>
                <Input
                  id="product-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (!editing) setSlug(slugify(event.target.value));
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
                <Input
                  id="product-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                />
                <FieldDescription>Латиниця, цифри та дефіс для URL.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Категорія</FieldLabel>
                <Select
                  items={categoryItems}
                  value={categoryId ?? "none"}
                  onValueChange={(value) =>
                    setCategoryId(
                      value === "none" || value == null ? null : String(value),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="product-desc">Опис</FieldLabel>
                <Textarea
                  id="product-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="product-active">Активний</FieldLabel>
                <Switch
                  id="product-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="product-featured">Хіт на головній</FieldLabel>
                <Switch
                  id="product-featured"
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
              </Field>
              <Field>
                <FieldLabel>Фото</FieldLabel>
                {imageUrls.length ? (
                  <div className="flex flex-wrap gap-2">
                    {imageUrls.map((url) => (
                      <div key={url} className="relative size-20 overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="size-full object-cover" />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="secondary"
                          className="absolute top-1 right-1"
                          aria-label="Прибрати фото"
                          onClick={() =>
                            setImageUrls((prev) => prev.filter((item) => item !== url))
                          }
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.target.value = "";
                  }}
                />
              </Field>
              {variants.map((variant, index) => (
                <FieldGroup key={index} className="rounded-xl border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Розмір</FieldLabel>
                      <Input
                        value={variant.size}
                        onChange={(event) => {
                          const next = [...variants];
                          next[index] = { ...variant, size: event.target.value };
                          setVariants(next);
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Колір</FieldLabel>
                      <Input
                        value={variant.color}
                        onChange={(event) => {
                          const next = [...variants];
                          next[index] = { ...variant, color: event.target.value };
                          setVariants(next);
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Ціна, грн</FieldLabel>
                      <Input
                        inputMode="numeric"
                        value={variant.priceUah}
                        onChange={(event) => {
                          const next = [...variants];
                          next[index] = { ...variant, priceUah: event.target.value };
                          setVariants(next);
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Сток</FieldLabel>
                      <Input
                        inputMode="numeric"
                        value={variant.stock}
                        onChange={(event) => {
                          const next = [...variants];
                          next[index] = { ...variant, stock: event.target.value };
                          setVariants(next);
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>SKU</FieldLabel>
                      <Input
                        value={variant.sku}
                        onChange={(event) => {
                          const next = [...variants];
                          next[index] = { ...variant, sku: event.target.value };
                          setVariants(next);
                        }}
                      />
                    </Field>
                  </div>
                  {variants.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setVariants(variants.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      Прибрати варіант
                    </Button>
                  ) : null}
                </FieldGroup>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setVariants([...variants, emptyVariant()])}
              >
                Додати варіант
              </Button>
            </FieldGroup>
      </AdminFormPanel>

      <ConfirmDelete
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Видалити товар?"
        description="Позицію буде прибрано з каталогу. Замовлення збережуть знімок назви."
        onConfirm={() => void remove()}
      />
    </div>
  );
}
