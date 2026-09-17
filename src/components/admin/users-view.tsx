"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconUser } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { AdminUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminUsersView() {
  const [items, setItems] = useState<AdminUser[] | null>(null);

  const load = async () => {
    const { items: next } = await api.admin.users.list();
    setItems(next);
  };

  useEffect(() => {
    let cancelled = false;
    void api.admin.users
      .list()
      .then(({ items: next }) => {
        if (!cancelled) setItems(next);
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

  const patch = async (
    user: AdminUser,
    input: { isBlocked?: boolean; isAdmin?: boolean },
  ) => {
    try {
      await api.admin.users.update(user.id, input);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося оновити",
      );
    }
  };

  if (items == null) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUser />
          </EmptyMedia>
          <EmptyTitle>Користувачів ще немає</EmptyTitle>
          <EmptyDescription>
            Профілі з’являться після входу в Mini App.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Користувач</TableHead>
              <TableHead>Telegram</TableHead>
              <TableHead>Замовлення</TableHead>
              <TableHead>Адмін</TableHead>
              <TableHead>Блок</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((user) => {
              const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{name || "Без імені"}</span>
                      {user.is_admin ? <Badge>Адмін</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    @{user.username || "—"} · {user.telegram_id}
                  </TableCell>
                  <TableCell className="tabular-nums">{user.orders_count}</TableCell>
                  <TableCell>
                    <Switch
                      checked={user.is_admin}
                      disabled={user.is_env_admin && user.is_admin}
                      onCheckedChange={(checked) =>
                        void patch(user, { isAdmin: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(user.is_blocked)}
                      disabled={user.is_env_admin}
                      onCheckedChange={(checked) =>
                        void patch(user, { isBlocked: checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 lg:hidden">
        {items.map((user) => {
          const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
          return (
            <Card key={user.id} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{name || "Без імені"}</span>
                  {user.is_admin ? <Badge>Адмін</Badge> : null}
                </CardTitle>
                <CardDescription>
                  @{user.username || "—"} · {user.telegram_id} ·{" "}
                  {user.orders_count} зам.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  Адмін
                  <Switch
                    checked={user.is_admin}
                    disabled={user.is_env_admin && user.is_admin}
                    onCheckedChange={(checked) =>
                      void patch(user, { isAdmin: checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  Заблокований
                  <Switch
                    checked={Boolean(user.is_blocked)}
                    disabled={user.is_env_admin}
                    onCheckedChange={(checked) =>
                      void patch(user, { isBlocked: checked })
                    }
                  />
                </label>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
