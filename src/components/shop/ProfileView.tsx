"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconHeart,
  IconPackage,
  IconShield,
  IconShoppingBag,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { api, ApiRequestError, apiErrorMessage } from "@/lib/api/client";
import type { OrderStatus, OrderWithItems, SessionUser } from "@/lib/types";
import { useTelegram } from "@/components/providers/telegram-provider";
import { useSession } from "@/components/providers/telegram-auth-bootstrap";
import { useFavoritesStore } from "@/lib/favorites/store";
import { mergeOrders, useLocalOrdersStore } from "@/lib/orders/local";
import {
  formatOrderDate,
  formatPrice,
  ORDER_STATUS_LABELS,
} from "@/lib/utils/app";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACTIVE_STATUSES: OrderStatus[] = ["new", "processing"];
const HISTORY_STATUSES: OrderStatus[] = ["done", "cancelled"];

function orderStatusVariant(status: OrderStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "done") return "outline" as const;
  if (status === "processing") return "default" as const;
  return "secondary" as const;
}

function displayName(
  session: SessionUser | null,
  telegram: { first_name?: string; last_name?: string; username?: string } | null,
) {
  const first = session?.firstName ?? telegram?.first_name ?? "";
  const last = session?.lastName ?? telegram?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const username = session?.username ?? telegram?.username;
  if (username) return `@${username}`;
  return "Гість";
}

function initials(name: string) {
  const parts = name.replace(/^@/, "").split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const preview = order.items
    .slice(0, 2)
    .map((item) => `${item.title_snapshot} × ${item.qty}`)
    .join(", ");
  const extra = order.items.length - 2;

  return (
    <Link href={`/profile/orders/${order.id}`} className="block">
      <Card size="sm">
        <CardHeader>
          <CardTitle>№ {order.id.slice(0, 8)}</CardTitle>
          <CardDescription>{formatOrderDate(order.created_at)}</CardDescription>
          <CardAction>
            <Badge variant={orderStatusVariant(order.status)}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {preview}
          {extra > 0 ? ` і ще ${extra}` : ""}
        </CardContent>
        <CardFooter className="justify-between">
          <span>{order.items.length} позицій</span>
          <span className="font-semibold text-foreground">
            {formatPrice(order.total_uah)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function OrdersEmpty({
  title,
  description,
  guest,
}: {
  title: string;
  description: string;
  guest?: boolean;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconPackage />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/" />} nativeButton={false}>
          {guest ? "До каталогу" : "Зробити замовлення"}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ProfileView() {
  const { user: telegramUser, isTelegram } = useTelegram();
  const { user: session, status, error } = useSession();
  const favoriteCount = useFavoritesStore((s) => s.productIds.length);
  const localOrders = useLocalOrdersStore((s) => s.orders);
  const [remoteOrders, setRemoteOrders] = useState<OrderWithItems[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (status === "loading") return;
      if (!session) {
        setRemoteOrders([]);
        setLoadingRemote(false);
        return;
      }
      try {
        const { items } = await api.orders.list();
        if (!cancelled) setRemoteOrders(items);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 401) {
          return;
        }
        toast.error(
          apiErrorMessage(err, "Не вдалося завантажити замовлення"),
        );
      } finally {
        if (!cancelled) setLoadingRemote(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const name = displayName(session, telegramUser);
  const username = session?.username ?? telegramUser?.username ?? null;
  const orders = useMemo(
    () => mergeOrders(remoteOrders, localOrders),
    [remoteOrders, localOrders],
  );
  const loading = status === "loading" || (Boolean(session) && loadingRemote);
  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.includes(order.status)),
    [orders],
  );
  const historyOrders = useMemo(
    () => orders.filter((order) => HISTORY_STATUSES.includes(order.status)),
    [orders],
  );
  const authHint = error
    ? apiErrorMessage(error)
    : !session && isTelegram
      ? "Відкрий магазин з Telegram, щоб увійти. Якщо вже всередині Mini App — натисни /start у боті."
      : null;

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-3">
      <header>
        <h1 className="text-lg font-semibold">Профіль</h1>
      </header>

      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {telegramUser?.photo_url ? (
                <AvatarImage src={telegramUser.photo_url} alt={name} />
              ) : null}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate">{name}</CardTitle>
              <CardDescription>
                {username
                  ? `@${username.replace(/^@/, "")}`
                  : "Telegram Mini App"}
              </CardDescription>
              {authHint ? (
                <CardDescription>{authHint}</CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              render={<Link href="/favorites" />}
              nativeButton={false}
            >
              <IconHeart data-icon="inline-start" />
              Обране · {favoriteCount}
            </Button>
            {session?.isAdmin ? (
              <Button
                variant="outline"
                render={<Link href="/admin" />}
                nativeButton={false}
              >
                <IconShield data-icon="inline-start" />
                Адмін
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full gap-4">
        <TabsList className="w-full overflow-hidden">
          <TabsTrigger value="active">
            <IconShoppingBag data-icon="inline-start" />
            Активні
          </TabsTrigger>
          <TabsTrigger value="history">Історія</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex flex-col gap-3">
          {loading ? (
            <OrdersSkeleton />
          ) : activeOrders.length === 0 ? (
            <OrdersEmpty
              title="Немає активних замовлень"
              description="Оформи замовлення — воно з’явиться тут."
            />
          ) : (
            activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-3">
          {loading ? (
            <OrdersSkeleton />
          ) : historyOrders.length === 0 ? (
            <OrdersEmpty
              title="Історія порожня"
              description="Виконані та скасовані замовлення з’являться тут."
            />
          ) : (
            historyOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}
