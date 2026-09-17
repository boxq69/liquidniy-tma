"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconArrowLeft,
  IconCheck,
  IconDiscount2,
  IconPhone,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api/client";
import { useCartStore } from "@/lib/cart/store";
import { useLocalOrdersStore } from "@/lib/orders/local";
import { useTelegram } from "@/components/providers/telegram-provider";
import { navigateWhenReady } from "@/lib/telegram/webapp-client";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/schemas";
import { formatPrice } from "@/lib/utils/app";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NovaPoshtaPicker,
  type NovaPoshtaSelection,
} from "@/components/shop/NovaPoshtaPicker";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS = [
  { id: "card" as const, label: "Картка" },
  { id: "qr" as const, label: "QR-код" },
  { id: "phone" as const, label: "За телефоном" },
];

const DELIVERY_UAH = 0;

type FormValues = CheckoutInput;

export function CheckoutView() {
  const router = useRouter();
  const { user, isTelegram } = useTelegram();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const addLocalOrder = useLocalOrdersStore((s) => s.add);
  const [submitting, setSubmitting] = useState(false);
  const [doneOrderId, setDoneOrderId] = useState<string | null>(null);
  const [npSelection, setNpSelection] = useState<NovaPoshtaSelection | null>(
    null,
  );

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountUah, setDiscountUah] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);

  const checkoutItems = useMemo(
    () => items.map(({ variantId, qty }) => ({ variantId, qty })),
    [items],
  );
  const itemsTotal = items.reduce(
    (sum, item) => sum + item.priceUah * item.qty,
    0,
  );
  const totalUah = Math.max(0, itemsTotal - discountUah) + DELIVERY_UAH;

  const form = useForm<FormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      comment: "",
      paymentMethod: "phone",
      promoCode: "",
      items: [],
    },
  });

  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });

  useEffect(() => {
    form.setValue("items", checkoutItems);
  }, [checkoutItems, form]);

  useEffect(() => {
    if (!user) return;
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    if (name && !form.getValues("customerName")) {
      form.setValue("customerName", name);
    }
  }, [user, form]);

  const handleNpChange = (next: NovaPoshtaSelection | null) => {
    setNpSelection(next);
    if (next) {
      form.setValue("novaPoshta", next, { shouldValidate: true });
    } else {
      form.resetField("novaPoshta");
    }
  };

  const applyPromo = async () => {
    const code = promoCode.trim();
    if (!code) {
      setAppliedPromo(null);
      setDiscountUah(0);
      form.setValue("promoCode", "");
      return;
    }
    setApplyingPromo(true);
    try {
      const preview = await api.promo.preview({
        code,
        items: checkoutItems,
      });
      setAppliedPromo(preview.promoCode);
      setDiscountUah(preview.discountUah);
      form.setValue("promoCode", preview.promoCode ?? code);
      toast.success(preview.message ?? "Промокод застосовано");
    } catch (err) {
      setAppliedPromo(null);
      setDiscountUah(0);
      form.setValue("promoCode", "");
      toast.error(
        err instanceof ApiRequestError ? err.message : "Промокод не застосовано",
      );
    } finally {
      setApplyingPromo(false);
    }
  };

  if (doneOrderId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 pb-20 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-primary/20 text-primary">
          <IconCheck className="size-7" stroke={2.5} />
        </div>
        <h1 className="text-xl font-semibold">Замовлення прийнято</h1>
        <p className="text-sm text-muted-foreground">
          Менеджер звʼяжеться з вами для підтвердження. Номер:{" "}
          <span className="font-mono text-foreground">
            {doneOrderId.slice(0, 8)}
          </span>
        </p>
        <Link href="/" className={cn(buttonVariants(), "rounded-full")}>
          На головну
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Кошик порожній</p>
        <Link href="/" className={cn(buttonVariants(), "rounded-full")}>
          До каталогу
        </Link>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const data = await api.orders.checkout({
        ...values,
        items: checkoutItems,
      });
      addLocalOrder(data.order);
      clear();
      setDoneOrderId(data.orderId);
      toast.success("Замовлення оформлено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Помилка мережі",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex min-h-full flex-col pb-40">
      <header className="flex items-center justify-between px-4 py-3">
        {isTelegram ? (
          <span className="size-10" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={() => navigateWhenReady(() => router.back())}
            aria-label="Назад"
            className="inline-flex size-10 items-center justify-center rounded-full"
          >
            <IconArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold">Оформлення</h1>
        <span className="size-10" aria-hidden />
      </header>

      <form id="checkout-form" onSubmit={onSubmit} className="flex flex-col gap-6 px-4">
        <section aria-labelledby="delivery-title" className="flex flex-col gap-3">
          <h2 id="delivery-title" className="text-sm text-muted-foreground">
            Адреса доставки
          </h2>

          <div className="flex flex-col gap-2">
            <NovaPoshtaPicker
              value={npSelection}
              onChange={handleNpChange}
              error={form.formState.errors.novaPoshta?.message
                ?? form.formState.errors.novaPoshta?.warehouseRef?.message
                ?? form.formState.errors.novaPoshta?.cityRef?.message}
            />
          </div>

          <div className="rounded-2xl bg-card p-3">
            <Label htmlFor="customerPhone" className="sr-only">
              Телефон
            </Label>
            <div className="flex items-start gap-3">
              <IconPhone className="mt-2.5 size-5 shrink-0 text-muted-foreground" />
              <Input
                id="customerPhone"
                type="tel"
                placeholder="Телефон отримувача"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                {...form.register("customerPhone")}
              />
            </div>
            {form.formState.errors.customerPhone ? (
              <p className="pl-8 text-xs text-destructive">
                {form.formState.errors.customerPhone.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-card p-3">
            <Label htmlFor="customerName">Імʼя</Label>
            <Input
              id="customerName"
              className="mt-1.5"
              placeholder="Як звертатися"
              {...form.register("customerName")}
            />
            {form.formState.errors.customerName ? (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.customerName.message}
              </p>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="payment-title" className="flex flex-col gap-3">
          <h2 id="payment-title" className="text-sm text-muted-foreground">
            Спосіб оплати
          </h2>
          <p className="text-xs text-muted-foreground">
            Оплата після підтвердження менеджером — без онлайн-платежу в
            застосунку.
          </p>
          <ul className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const selected = paymentMethod === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => form.setValue("paymentMethod", opt.id)}
                    className={cn(
                      "relative flex h-20 w-full flex-col items-center justify-center rounded-2xl border bg-card text-sm font-medium transition-colors",
                      selected
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground",
                    )}
                  >
                    {selected ? (
                      <span className="absolute top-2 right-2 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <IconCheck className="size-3" stroke={3} />
                      </span>
                    ) : null}
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2 rounded-2xl bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <IconDiscount2 className="size-5 text-muted-foreground" />
              <Input
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
                placeholder="Промокод"
                className="border-0 bg-transparent px-0 uppercase shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={applyingPromo}
                onClick={() => void applyPromo()}
              >
                {applyingPromo ? "…" : appliedPromo ? "Ок" : "Застосувати"}
              </Button>
            </div>
            {appliedPromo ? (
              <p className="text-xs text-muted-foreground">
                Код {appliedPromo}: −{formatPrice(discountUah)}
              </p>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="price-title" className="flex flex-col gap-3">
          <h2 id="price-title" className="text-sm text-muted-foreground">
            До вартості входить
          </h2>
          <div className="flex flex-col gap-2 rounded-2xl bg-card p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Товари</span>
              <span className="tabular-nums">{formatPrice(itemsTotal)}</span>
            </div>
            {discountUah > 0 ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Промокод</span>
                <span className="tabular-nums">−{formatPrice(discountUah)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Доставка</span>
              <span className="tabular-nums text-muted-foreground">
                {DELIVERY_UAH > 0
                  ? formatPrice(DELIVERY_UAH)
                  : "уточнюється"}
              </span>
            </div>
            <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted-foreground">
              {items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {item.title} · {item.size} × {item.qty}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(item.priceUah * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card p-3">
            <Label htmlFor="comment">Коментар</Label>
            <Textarea
              id="comment"
              rows={2}
              className="mt-1.5 resize-none"
              placeholder="Необовʼязково"
              {...form.register("comment")}
            />
          </div>
        </section>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="rounded-[1.75rem] border border-white/10 bg-card p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between px-1 text-sm">
            <span className="text-muted-foreground">Разом:</span>
            <span className="font-bold tabular-nums">
              {formatPrice(totalUah)}
            </span>
          </div>
          <Button
            type="submit"
            form="checkout-form"
            className="h-12 w-full rounded-full"
            disabled={submitting}
          >
            {submitting ? "Надсилаємо…" : "Замовити"}
          </Button>
        </div>
      </div>
    </div>
  );
}
