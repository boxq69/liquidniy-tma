import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import type { ProductCard as ProductCardData } from "@/lib/catalog/types";
import { ProductCard } from "@/components/shop/ProductCard";
import { ScrollRail } from "@/components/shop/scroll-rail";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { catalogHref } from "@/lib/catalog/params";

type BestsellersProps = {
  title?: string;
  excludeSlug?: string;
  showSeeAll?: boolean;
  products?: ProductCardData[];
};

const Bestsellers = ({
  title = "Бестселери",
  excludeSlug,
  showSeeAll = true,
  products = [],
}: BestsellersProps) => {
  const deals = products.filter((product) => product.slug !== excludeSlug);

  if (deals.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl bg-secondary p-2"
      aria-labelledby="bestsellers-title"
    >
      <div className="flex items-center justify-between px-4">
        <h2 id="bestsellers-title" className="text-2xl font-bold">
          <Link href={catalogHref({ featured: true })}>{title}</Link>
        </h2>
        {showSeeAll ? (
          <Link
            href={catalogHref({ featured: true })}
            className={cn(buttonVariants({ variant: "outline" }), "gap-1")}
          >
            Усі
            <IconArrowRight data-icon="inline-end" />
          </Link>
        ) : null}
      </div>

      <ScrollRail className="px-4 pb-1">
        <ul className="flex w-max gap-3">
          {deals.map((product) => (
            <li key={product.id} className="w-40 shrink-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </ScrollRail>
    </section>
  );
};

export default Bestsellers;
