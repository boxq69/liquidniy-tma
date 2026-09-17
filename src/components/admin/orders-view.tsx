"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { IconPackage } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { OrderStatus, OrderWithItems } from "@/lib/types";
import {
  formatOrderDate,
  formatPrice,
  ORDER_STATUS_LABELS,
} from "@/lib/utils/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(status: OrderStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "done") return "outline" as const;
  if (status === "processing") return "default" as const;
  return "secondary" as const;
}

export function AdminOrdersView() {
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [items, setItems] = useState<OrderWithItems[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.admin.orders
      .list(status === "all" ? undefined : status)
      .then(({ items: next }) => {
        if (!cancelled) setItems(next);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiRequestError
            ? err.message
            : "Не вдалося завантажити замовлення",
        );
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        value={[status]}
        onValueChange={(value) => {
          const next = value[0] as OrderStatus | "all" | undefined;
          if (next) setStatus(next);
        }}
        className="flex flex-wrap"
        size="sm"
      >
        <ToggleGroupItem value="all">Усі</ToggleGroupItem>
        <ToggleGroupItem value="new">Нові</ToggleGroupItem>
        <ToggleGroupItem value="processing">В обробці</ToggleGroupItem>
        <ToggleGroupItem value="done">Виконані</ToggleGroupItem>
        <ToggleGroupItem value="cancelled">Скасовані</ToggleGroupItem>
      </ToggleGroup>

      {items == null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPackage />
            </EmptyMedia>
            <EmptyTitle>Замовлень немає</EmptyTitle>
            <EmptyDescription>
              Нові замовлення з’являться тут після оформлення.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сума</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {order.customer_phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatOrderDate(order.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.status)}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatPrice(order.total_uah)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/admin/orders/${order.id}`} />}
                        nativeButton={false}
                      >
                        Відкрити
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 lg:hidden">
            {items.map((order) => (
              <Card key={order.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{order.customer_name}</span>
                    <Badge variant={statusVariant(order.status)}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {formatOrderDate(order.created_at)} · {order.customer_phone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <p className="font-semibold tabular-nums">
                    {formatPrice(order.total_uah)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/admin/orders/${order.id}`} />}
                    nativeButton={false}
                  >
                    Відкрити
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
