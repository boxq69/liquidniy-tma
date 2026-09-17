"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api/client";
import type { OrderStatus, OrderWithItems } from "@/lib/types";
import {
  formatOrderDate,
  formatPrice,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: OrderStatus[] = ["new", "processing", "done", "cancelled"];

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.admin.orders
      .get(orderId)
      .then(({ order: next }) => {
        if (!cancelled) setOrder(next);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiRequestError ? err.message : "Замовлення не знайдено",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!order) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const payment = order.telegram_snapshot?.paymentMethod;
  const address = order.telegram_snapshot?.customerAddress;

  const setStatus = async (status: OrderStatus) => {
    setSaving(true);
    try {
      const { order: next } = await api.admin.orders.setStatus(order.id, status);
      setOrder(next);
      toast.success("Статус оновлено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося оновити",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{order.customer_name}</CardTitle>
          <CardDescription>
            {formatOrderDate(order.created_at)} · {order.customer_phone}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Статус</span>
            <Select
              items={STATUSES.map((status) => ({
                value: status,
                label: ORDER_STATUS_LABELS[status],
              }))}
              value={order.status}
              onValueChange={(value) => {
                if (typeof value === "string") void setStatus(value as OrderStatus);
              }}
              disabled={saving}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {saving ? <Spinner /> : null}
          {typeof address === "string" ? (
            <p className="text-sm">{address}</p>
          ) : null}
          {payment === "card" || payment === "qr" || payment === "phone" ? (
            <p className="text-sm text-muted-foreground">
              {PAYMENT_METHOD_LABELS[payment]}
            </p>
          ) : null}
          {order.comment ? (
            <p className="text-sm whitespace-pre-wrap">{order.comment}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Склад</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <span>
                {item.title_snapshot} · {item.size_snapshot} × {item.qty}
              </span>
              <span className="tabular-nums">
                {formatPrice(item.price_uah * item.qty)}
              </span>
            </div>
          ))}
          <Separator />
          {order.promo_code ? (
            <div className="flex justify-between text-sm">
              <span>Промокод {order.promo_code}</span>
              <span className="tabular-nums">
                −{formatPrice(order.discount_uah ?? 0)}
              </span>
            </div>
          ) : null}
          {order.subtotal_uah != null && order.subtotal_uah !== order.total_uah ? (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Підсумок</span>
              <span className="tabular-nums">{formatPrice(order.subtotal_uah)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <span>Разом</span>
            <span className="tabular-nums">{formatPrice(order.total_uah)}</span>
          </div>
        </CardContent>
      </Card>

      {order.profile ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Telegram</CardTitle>
            <CardDescription>
              @{order.profile.username || "без username"} · {order.profile.telegram_id}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Button
        variant="outline"
        render={<Link href="/admin/orders" />}
        nativeButton={false}
      >
        До списку
      </Button>
    </div>
  );
}
