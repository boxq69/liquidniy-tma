"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { AppliesTo, Category, DiscountType, ProductWithDetails, Promotion } from "@/lib/types";
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
  name: "",
  description: "",
  badgeText: "",
  discountType: "percent" as DiscountType,
  discountValue: "20",
  appliesTo: "all" as AppliesTo,
  productIds: [] as string[],
  categoryIds: [] as string[],
  startsAt: "",
  endsAt: "",
  isActive: true,
  stackWithPromo: true,
  priority: "0",
};

export function AdminPromotionsView() {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [{ items: next }, { items: productItems }, { items: cats }] =
      await Promise.all([
        api.admin.promotions.list(),
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
      api.admin.promotions.list(),
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

  const fill = (promotion: Promotion | null) => {
    setEditing(promotion);
    setForm(
      promotion
        ? {
            name: promotion.name,
            description: promotion.description,
            badgeText: promotion.badge_text,
            discountType: promotion.discount_type,
            discountValue: String(promotion.discount_value),
            appliesTo: promotion.applies_to,
            productIds: promotion.product_ids,
            categoryIds: promotion.category_ids,
            startsAt: toDatetimeLocalValue(promotion.starts_at),
            endsAt: toDatetimeLocalValue(promotion.ends_at),
            isActive: promotion.is_active,
            stackWithPromo: promotion.stack_with_promo,
            priority: String(promotion.priority),
          }
        : emptyForm,
    );
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        badgeText: form.badgeText,
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        appliesTo: form.appliesTo,
        productIds: form.productIds,
        categoryIds: form.categoryIds,
        startsAt: fromDatetimeLocal(form.startsAt),
        endsAt: fromDatetimeLocal(form.endsAt),
        isActive: form.isActive,
        stackWithPromo: form.stackWithPromo,
        priority: Number(form.priority) || 0,
      };
      if (editing) {
        await api.admin.promotions.update(editing.id, payload);
      } else {
        await api.admin.promotions.create(payload);
      }
      await load();
      setOpen(false);
      toast.success(editing ? "Акцію оновлено" : "Акцію створено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося зберегти",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promotion: Promotion, isActive: boolean) => {
    try {
      await api.admin.promotions.update(promotion.id, { isActive });
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
      await api.admin.promotions.remove(pendingDelete.id);
      await load();
      setPendingDelete(null);
      toast.success("Акцію видалено");
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
          Нова акція
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
            <EmptyTitle>Акцій немає</EmptyTitle>
            <EmptyDescription>
              Знижка на каталог, категорію або окремі товари з бейджем у магазині.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Знижка</TableHead>
                  <TableHead>Охоплення</TableHead>
                  <TableHead>Період</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium"
                        onClick={() => fill(promotion)}
                      >
                        {promotion.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {discountBadge(promotion.discount_type, promotion.discount_value)}
                      </Badge>
                    </TableCell>
                    <TableCell>{appliesToLabel(promotion.applies_to)}</TableCell>
                    <TableCell>
                      {scheduleLabel(
                        promotion.is_active,
                        promotion.starts_at,
                        promotion.ends_at,
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={promotion.is_active}
                        onCheckedChange={(checked) => void toggleActive(promotion, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => fill(promotion)}>
                          Редагувати
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Видалити"
                          onClick={() => setPendingDelete(promotion)}
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
            {items.map((promotion) => (
              <Card key={promotion.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <button type="button" className="text-left" onClick={() => fill(promotion)}>
                      {promotion.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Видалити"
                      onClick={() => setPendingDelete(promotion)}
                    >
                      <IconTrash />
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-2">
                    <Badge>
                      {discountBadge(promotion.discount_type, promotion.discount_value)}
                    </Badge>
                    {appliesToLabel(promotion.applies_to)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field orientation="horizontal">
                    <FieldLabel>Активна</FieldLabel>
                    <Switch
                      checked={promotion.is_active}
                      onCheckedChange={(checked) => void toggleActive(promotion, checked)}
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
        title={editing ? "Редагувати акцію" : "Нова акція"}
        description="Ціна в магазині зміниться автоматично для обраного охоплення."
        wide
        footer={
          <Button onClick={() => void save()} disabled={saving || form.name.length < 2}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            Зберегти
          </Button>
        }
      >
        <FieldGroup>
              <Field>
                <FieldLabel htmlFor="promo-name">Назва</FieldLabel>
                <Input
                  id="promo-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="promo-badge">Бейдж</FieldLabel>
                <Input
                  id="promo-badge"
                  placeholder="-20%"
                  value={form.badgeText}
                  onChange={(event) => setForm({ ...form, badgeText: event.target.value })}
                />
                <FieldDescription>Короткий напис на картці товару.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="promo-desc">Опис</FieldLabel>
                <Textarea
                  id="promo-desc"
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
                <FieldLabel htmlFor="promo-value">Значення</FieldLabel>
                <Input
                  id="promo-value"
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={(event) =>
                    setForm({ ...form, discountValue: event.target.value })
                  }
                />
              </Field>
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
                  <FieldLabel htmlFor="promo-start">Початок</FieldLabel>
                  <Input
                    id="promo-start"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="promo-end">Кінець</FieldLabel>
                  <Input
                    id="promo-end"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="promo-priority">Пріоритет</FieldLabel>
                <Input
                  id="promo-priority"
                  inputMode="numeric"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                />
                <FieldDescription>
                  Якщо кілька акцій перетинаються, виграє більший пріоритет.
                </FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="promo-active">Активна</FieldLabel>
                <Switch
                  id="promo-active"
                  checked={form.isActive}
                  onCheckedChange={(isActive) => setForm({ ...form, isActive })}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="promo-stack">Поєднується з промокодом</FieldLabel>
                <Switch
                  id="promo-stack"
                  checked={form.stackWithPromo}
                  onCheckedChange={(stackWithPromo) =>
                    setForm({ ...form, stackWithPromo })
                  }
                />
              </Field>
        </FieldGroup>
      </AdminFormPanel>

      <ConfirmDelete
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Видалити акцію?"
        description="Ціни в магазині повернуться до звичайних."
        onConfirm={() => void remove()}
      />
    </div>
  );
}
