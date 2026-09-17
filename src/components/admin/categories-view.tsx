"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconChevronDown, IconChevronUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { Category, ProductWithDetails } from "@/lib/types";
import { slugify } from "@/lib/utils/app";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminFormPanel } from "@/components/admin/form-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminCategoriesView() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [showOnHome, setShowOnHome] = useState(true);

  const load = async () => {
    const [{ items: next }, { items: productItems }] = await Promise.all([
      api.admin.categories.list(),
      api.admin.products.list(),
    ]);
    setItems(next);
    setProducts(productItems);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.admin.categories.list(), api.admin.products.list()])
      .then(([{ items: next }, { items: productItems }]) => {
        if (cancelled) return;
        setItems(next);
        setProducts(productItems);
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

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setIsVisible(true);
    setShowOnHome(true);
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setIsVisible(category.is_visible);
    setShowOnHome(category.show_on_home);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || slugify(name),
        sortOrder: editing?.sort_order ?? (items?.length ?? 0) + 1,
        isVisible,
        showOnHome,
      };
      if (editing) {
        await api.admin.categories.update(editing.id, payload);
      } else {
        await api.admin.categories.create(payload);
      }
      await load();
      setOpen(false);
      toast.success(editing ? "Категорію оновлено" : "Категорію створено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося зберегти",
      );
    } finally {
      setSaving(false);
    }
  };

  const patchFlags = async (
    category: Category,
    patch: Partial<{ isVisible: boolean; showOnHome: boolean; sortOrder: number }>,
  ) => {
    try {
      await api.admin.categories.update(category.id, patch);
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
      await api.admin.categories.remove(pendingDelete.id);
      await load();
      setPendingDelete(null);
      toast.success("Категорію видалено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося видалити",
      );
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!items) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const current = items[index];
    const swap = items[nextIndex];
    await Promise.all([
      api.admin.categories.update(current.id, { sortOrder: swap.sort_order }),
      api.admin.categories.update(swap.id, { sortOrder: current.sort_order }),
    ]);
    await load();
  };

  const productCount = (id: string) =>
    products.filter((product) => product.category_id === id).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <IconPlus data-icon="inline-start" />
          Додати категорію
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
            <EmptyTitle>Категорій ще немає</EmptyTitle>
            <EmptyDescription>Створіть першу, щоб групувати товари.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Товарів</TableHead>
                  <TableHead>Видима</TableHead>
                  <TableHead>На головній</TableHead>
                  <TableHead className="text-right">Порядок</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((category, index) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium"
                        onClick={() => openEdit(category)}
                      >
                        {category.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell className="tabular-nums">
                      {productCount(category.id)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={category.is_visible}
                        onCheckedChange={(checked) =>
                          void patchFlags(category, { isVisible: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={category.show_on_home}
                        onCheckedChange={(checked) =>
                          void patchFlags(category, { showOnHome: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          aria-label="Вище"
                          onClick={() => void move(index, -1)}
                        >
                          <IconChevronUp />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === items.length - 1}
                          aria-label="Нижче"
                          onClick={() => void move(index, 1)}
                        >
                          <IconChevronDown />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Видалити"
                          onClick={() => setPendingDelete(category)}
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
            {items.map((category, index) => (
              <Card key={category.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => openEdit(category)}
                    >
                      {category.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Видалити"
                      onClick={() => setPendingDelete(category)}
                    >
                      <IconTrash />
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-2">
                    {category.slug}
                    <Badge variant="outline">{productCount(category.id)} товарів</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Field orientation="horizontal">
                    <FieldLabel>Видима в магазині</FieldLabel>
                    <Switch
                      checked={category.is_visible}
                      onCheckedChange={(checked) =>
                        void patchFlags(category, { isVisible: checked })
                      }
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel>Показувати на головній</FieldLabel>
                    <Switch
                      checked={category.show_on_home}
                      onCheckedChange={(checked) =>
                        void patchFlags(category, { showOnHome: checked })
                      }
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => void move(index, -1)}
                    >
                      Вище
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={index === items.length - 1}
                      onClick={() => void move(index, 1)}
                    >
                      Нижче
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <AdminFormPanel
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Редагувати категорію" : "Нова категорія"}
        footer={
          <Button onClick={() => void save()} disabled={saving || name.length < 2}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            Зберегти
          </Button>
        }
      >
        <FieldGroup>
              <Field>
                <FieldLabel htmlFor="category-name">Назва</FieldLabel>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!editing) setSlug(slugify(event.target.value));
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
                <Input
                  id="category-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="category-visible">Видима</FieldLabel>
                <Switch
                  id="category-visible"
                  checked={isVisible}
                  onCheckedChange={setIsVisible}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="category-home">На головній</FieldLabel>
                <Switch
                  id="category-home"
                  checked={showOnHome}
                  onCheckedChange={setShowOnHome}
                />
              </Field>
        </FieldGroup>
      </AdminFormPanel>

      <ConfirmDelete
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Видалити категорію?"
        description="Товари залишаться, але без цієї категорії."
        onConfirm={() => void remove()}
      />
    </div>
  );
}
