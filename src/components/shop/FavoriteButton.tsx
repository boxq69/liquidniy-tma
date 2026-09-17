"use client";

import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProductCard } from "@/lib/catalog/types";
import { useFavoritesStore } from "@/lib/favorites/store";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  product: ProductCard;
  className?: string;
};

export function FavoriteButton({ product, className }: FavoriteButtonProps) {
  const isFavorite = useFavoritesStore((s) => s.productIds.includes(product.id));
  const toggle = useFavoritesStore((s) => s.toggle);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isFavorite ? "Прибрати з обраного" : "Додати в обране"}
      aria-pressed={isFavorite}
      className={cn("rounded-full bg-background", className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const added = toggle(product);
        toast.success(added ? "Додано в обране" : "Прибрано з обраного");
      }}
    >
      {isFavorite ? (
        <IconHeartFilled className="text-destructive" />
      ) : (
        <IconHeart />
      )}
    </Button>
  );
}
