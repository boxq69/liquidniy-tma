"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconPackage } from "@tabler/icons-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api/client";
import type { OrderStatus, OrderWithItems } from "@/lib/types";
import { useTelegram } from "@/components/providers/telegram-provider";
import { navigateWhenReady } from "@/lib/telegram/webapp-client";
import { useLocalOrdersStore } from "@/lib/orders/local";
import {
  formatOrderDate,
  formatPrice,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function orderStatusVariant(status: OrderStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "done") return "outline" as const;
  if (status === "processing") return "default" as const;
  return "secondary" as const;
}

function snapshotText(order: OrderWithItems, key: string) {
  const value = order.telegram_snapshot?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function paymentLabel(order: OrderWithItems) {
  const method = snapshotText(order, "paymentMethod");
  if (method === "card" || method === "qr" || method === "phone") {
    return PAYMENT_METHOD_LABELS[method];
  }
  return null;
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { isTelegram } = useTelegram();
  const localOrder = useLocalOrdersStore((s) =>
    s.orders.find((item) => item.id === orderId),
  );
  const [order, setOrder] = useState<OrderWithItems | null>(localOrder ?? null);
  const [loading, setLoading] = useState(!localOrder);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { order: next } = await api.orders.get(orderId);
        if (!cancelled) {
          setOrder(next);
          setMissing(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (localOrder) {
          setOrder(localOrder);
          return;
        }
        if (
          err instanceof ApiRequestError &&
          (err.status === 401 || err.status === 404)
        ) {
          setMissing(true);
          return;
        }
        toast.error(
          err instanceof Error ? err.message : "Не вдалося відкрити замовлення",
        );
        setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, localOrder]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (missing || !order) {
    return (
      <Empty className="min-h-[70dvh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPackage />
          </EmptyMedia>
          <EmptyTitle>Замовлення не знайдено</EmptyTitle>
          <EmptyDescription>
            Воно могло бути видалене або належить іншому акаунту.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/profile" />} nativeButton={false}>
            До профілю
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const address = snapshotText(order, "customerAddress");
  const payment = paymentLabel(order);

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-3 pb-8">
      <header className="flex items-center justify-between">
        {isTelegram ? (
          <span className="size-10" aria-hidden />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Назад"
            onClick={() => navigateWhenReady(() => router.back())}
          >
            <IconArrowLeft />
          </Button>
        )}
        <h1 className="text-lg font-semibold">Замовлення</h1>
        <span className="size-10" aria-hidden />
      </header>

      <Card size="sm">
        <CardHeader>
          <CardTitle>№ {order.id.slice(0, 8)}</CardTitle>
          <CardDescription>{formatOrderDate(order.created_at)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Badge variant={orderStatusVariant(order.status)} className="w-fit">
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <p>{order.customer_name}</p>
          <p className="text-muted-foreground">{order.customer_phone}</p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Товари</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title_snapshot}</p>
                <p className="text-muted-foreground">
                  {item.size_snapshot}
                  {item.color_snapshot ? ` · ${item.color_snapshot}` : ""}
                  {` · ${item.qty} шт.`}
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {formatPrice(item.price_uah * item.qty)}
              </p>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Separator />
          <div className="flex w-full items-center justify-between">
            <span>Разом</span>
            <span className="text-base font-semibold">
              {formatPrice(order.total_uah)}
            </span>
          </div>
        </CardFooter>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Доставка</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-muted-foreground">
          {address ? <p>{address}</p> : null}
          {payment ? <p>Оплата: {payment}</p> : null}
          {order.comment ? <p className="whitespace-pre-wrap">{order.comment}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
