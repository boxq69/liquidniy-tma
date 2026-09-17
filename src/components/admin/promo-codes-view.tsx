"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { AppliesTo, Category, DiscountType, ProductWithDetails, PromoCode } from "@/lib/types";
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
import { ScopePicker } from "@/components/admin/scope-picker";
import {
  appliesToLabel,
  discountBadge,
  fromDatetimeLocal,
  scheduleLabel,
  toDatetimeLocalValue,
} from "@/components/admin/helpers";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AdminFormPanel } from "@/components/admin/form-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const emptyForm = {
  code: "",
  description: "",
  discountType: "percent" as DiscountType,
  discountValue: "10",
  minOrderUah: "0",
  maxDiscountUah: "",
  usageLimit: "",
  usageLimitPerUser: "1",
  firstOrderOnly: false,
  combinableWithSale: true,
  appliesTo: "all" as AppliesTo,
  productIds: [] as string[],
  categoryIds: [] as string[],
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export function AdminPromoCodesView() {
  const [items, setItems] = useState<PromoCode[] | null>(null);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [{ items: next }, { items: productItems }, { items: cats }] =
      await Promise.all([
        api.admin.promoCodes.list(),
        api.admin.products.list(),
        api.admin.categories.list(),
      ]);
    setItems(next);
    setProducts(productItems);
    setCategories(cats);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.admin.promoCodes.list(),
      api.admin.products.list(),
      api.admin.categories.list(),
    ])
      .then(([{ items: next }, { items: productItems }, { items: cats }]) => {
        if (cancelled) return;
        setItems(next);
        setProducts(productItems);
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

  const fill = (promo: PromoCode | null) => {
    setEditing(promo);
    setForm(
      promo
        ? {
            code: promo.code,
            description: promo.description,
            discountType: promo.discount_type,
            discountValue: String(promo.discount_value),
            minOrderUah: String(promo.min_order_uah),
            maxDiscountUah: promo.max_discount_uah ? String(promo.max_discount_uah) : "",
            usageLimit: promo.usage_limit ? String(promo.usage_limit) : "",
            usageLimitPerUser: promo.usage_limit_per_user
              ? String(promo.usage_limit_per_user)
              : "",
            firstOrderOnly: promo.first_order_only,
            combinableWithSale: promo.combinable_with_sale,
            appliesTo: promo.applies_to,
            productIds: promo.product_ids,
            categoryIds: promo.category_ids,
            startsAt: toDatetimeLocalValue(promo.starts_at),
            endsAt: toDatetimeLocalValue(promo.ends_at),
            isActive: promo.is_active,
          }
        : emptyForm,
    );
    setOpen(true);
  };

  const optionalInt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        minOrderUah: Number(form.minOrderUah) || 0,
        maxDiscountUah: optionalInt(form.maxDiscountUah),
        usageLimit: optionalInt(form.usageLimit),
        usageLimitPerUser: optionalInt(form.usageLimitPerUser),
        firstOrderOnly: form.firstOrderOnly,
        combinableWithSale: form.combinableWithSale,
        appliesTo: form.appliesTo,
        productIds: form.productIds,
        categoryIds: form.categoryIds,
        startsAt: fromDatetimeLocal(form.startsAt),
        endsAt: fromDatetimeLocal(form.endsAt),
        isActive: form.isActive,
      };
      if (editing) {
        await api.admin.promoCodes.update(editing.id, payload);
      } else {
        await api.admin.promoCodes.create(payload);
      }
      await load();
      setOpen(false);
      toast.success(editing ? "Промокод оновлено" : "Промокод створено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося зберегти",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo: PromoCode, isActive: boolean) => {
    try {
      await api.admin.promoCodes.update(promo.id, { isActive });
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
      await api.admin.promoCodes.remove(pendingDelete.id);
      await load();
      setPendingDelete(null);
      toast.success("Промокод видалено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося видалити",
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => fill(null)}>
          <IconPlus data-icon="inline-start" />
          Новий промокод
        </Button>
      </div>

      {items == null ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPlus />
            </EmptyMedia>
            <EmptyTitle>Промокодів немає</EmptyTitle>
            <EmptyDescription>
              Створіть код зі знижкою, лімітами та умовами для checkout.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Знижка</TableHead>
                  <TableHead>Охоплення</TableHead>
                  <TableHead>Використано</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono font-medium"
                        onClick={() => fill(promo)}
                      >
                        {promo.code}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {discountBadge(promo.discount_type, promo.discount_value)}
                      </Badge>
                    </TableCell>
                    <TableCell>{appliesToLabel(promo.applies_to)}</TableCell>
                    <TableCell className="tabular-nums">
                      {promo.used_count}
                      {promo.usage_limit != null ? ` / ${promo.usage_limit}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={(checked) => void toggleActive(promo, checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {scheduleLabel(promo.is_active, promo.starts_at, promo.ends_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => fill(promo)}>
                          Редагувати
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Видалити"
                          onClick={() => setPendingDelete(promo)}
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
            {items.map((promo) => (
              <Card key={promo.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="font-mono"
                      onClick={() => fill(promo)}
                    >
                      {promo.code}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Видалити"
                      onClick={() => setPendingDelete(promo)}
                    >
                      <IconTrash />
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-2">
                    <Badge>
                      {discountBadge(promo.discount_type, promo.discount_value)}
                    </Badge>
                    {promo.used_count} використань
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field orientation="horizontal">
                    <FieldLabel>Активний</FieldLabel>
                    <Switch
                      checked={promo.is_active}
                      onCheckedChange={(checked) => void toggleActive(promo, checked)}
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
        title={editing ? "Редагувати промокод" : "Новий промокод"}
        description="Ліміти, мінімальна сума, перше замовлення та поєднання з акціями."
        wide
        footer={
          <Button onClick={() => void save()} disabled={saving || form.code.length < 3}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            Зберегти
          </Button>
        }
      >
        <FieldGroup>
              <Field>
                <FieldLabel htmlFor="code">Код</FieldLabel>
                <Input
                  id="code"
                  className="font-mono uppercase"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="code-desc">Опис</FieldLabel>
                <Textarea
                  id="code-desc"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Тип знижки</FieldLabel>
                <ToggleGroup
                  value={[form.discountType]}
                  onValueChange={(value) => {
                    const next = value[0] as DiscountType | undefined;
                    if (next) setForm({ ...form, discountType: next });
                  }}
                  spacing={2}
                >
                  <ToggleGroupItem value="percent">Відсоток</ToggleGroupItem>
                  <ToggleGroupItem value="fixed">Фіксована, грн</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="code-value">Значення</FieldLabel>
                <Input
                  id="code-value"
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={(event) =>
                    setForm({ ...form, discountValue: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="min-order">Мін. сума, грн</FieldLabel>
                  <Input
                    id="min-order"
                    inputMode="numeric"
                    value={form.minOrderUah}
                    onChange={(event) =>
                      setForm({ ...form, minOrderUah: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="max-discount">Макс. знижка, грн</FieldLabel>
                  <Input
                    id="max-discount"
                    inputMode="numeric"
                    placeholder="без ліміту"
                    value={form.maxDiscountUah}
                    onChange={(event) =>
                      setForm({ ...form, maxDiscountUah: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="usage-limit">Ліміт використань</FieldLabel>
                  <Input
                    id="usage-limit"
                    inputMode="numeric"
                    placeholder="безліміт"
                    value={form.usageLimit}
                    onChange={(event) =>
                      setForm({ ...form, usageLimit: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="usage-user">На одного покупця</FieldLabel>
                  <Input
                    id="usage-user"
                    inputMode="numeric"
                    placeholder="безліміт"
                    value={form.usageLimitPerUser}
                    onChange={(event) =>
                      setForm({ ...form, usageLimitPerUser: event.target.value })
                    }
                  />
                </Field>
              </div>
              <ScopePicker
                appliesTo={form.appliesTo}
                onAppliesToChange={(appliesTo) => setForm({ ...form, appliesTo })}
                productIds={form.productIds}
                categoryIds={form.categoryIds}
                onProductIdsChange={(productIds) => setForm({ ...form, productIds })}
                onCategoryIdsChange={(categoryIds) => setForm({ ...form, categoryIds })}
                products={products}
                categories={categories}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="code-start">Початок</FieldLabel>
                  <Input
                    id="code-start"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="code-end">Кінець</FieldLabel>
                  <Input
                    id="code-end"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                  />
                </Field>
              </div>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="first-order">Лише перше замовлення</FieldLabel>
                <Switch
                  id="first-order"
                  checked={form.firstOrderOnly}
                  onCheckedChange={(firstOrderOnly) =>
                    setForm({ ...form, firstOrderOnly })
                  }
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="combo-sale">Поєднується з акцією</FieldLabel>
                <Switch
                  id="combo-sale"
                  checked={form.combinableWithSale}
                  onCheckedChange={(combinableWithSale) =>
                    setForm({ ...form, combinableWithSale })
                  }
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="code-active">Активний</FieldLabel>
                <Switch
                  id="code-active"
                  checked={form.isActive}
                  onCheckedChange={(isActive) => setForm({ ...form, isActive })}
                />
              </Field>
              <FieldDescription>
                Порожні ліміти означають без обмежень. Код нечутливий до регістру.
              </FieldDescription>
        </FieldGroup>
      </AdminFormPanel>

      <ConfirmDelete
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Видалити промокод?"
        description="Нові замовлення більше не зможуть його застосувати."
        onConfirm={() => void remove()}
      />
    </div>
  );
}
