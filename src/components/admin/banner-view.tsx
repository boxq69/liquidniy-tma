"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconPhoto } from "@tabler/icons-react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { SiteBanner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminBannerView() {
  const [banner, setBanner] = useState<SiteBanner | null>(null);
  const [title, setTitle] = useState("");
  const [href, setHref] = useState("/");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.admin.banner
      .get()
      .then(({ banner: next }) => {
        if (cancelled) return;
        setBanner(next);
        setTitle(next.title);
        setHref(next.href);
        setIsActive(next.is_active);
        setImageUrl(next.image_url);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiRequestError
            ? err.message
            : "Не вдалося завантажити банер",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upload = async (file: File) => {
    try {
      const { url } = await api.admin.uploadImage(file);
      setImageUrl(url);
      toast.success("Фото завантажено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Не вдалося завантажити фото",
      );
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { banner: next } = await api.admin.banner.update({
        imageUrl,
        href,
        title,
        isActive,
      });
      setBanner(next);
      toast.success("Банер збережено");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Не вдалося зберегти",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!banner) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Головний банер</CardTitle>
          <CardDescription>
            Показується зверху на головній сторінці магазину.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Перегляд</FieldLabel>
              <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={title || "Банер"}
                  className="size-full object-cover"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="banner-file">Нове фото</FieldLabel>
              <Input
                id="banner-file"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.target.value = "";
                }}
              />
              <FieldDescription>JPEG, PNG, WebP або GIF до 5 МБ.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="banner-title">Підпис</FieldLabel>
              <Input
                id="banner-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="banner-href">Посилання</FieldLabel>
              <Input
                id="banner-href"
                value={href}
                onChange={(event) => setHref(event.target.value)}
                placeholder="/catalog?featured=1"
              />
              <FieldDescription>
                Куди вести після натискання. Наприклад / або /catalog?featured=1
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="banner-active">Показувати</FieldLabel>
              <Switch
                id="banner-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </Field>
            <Button onClick={() => void save()} disabled={saving || !imageUrl}>
              {saving ? <Spinner data-icon="inline-start" /> : <IconPhoto data-icon="inline-start" />}
              Зберегти
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
