import Bestsellers from "@/components/shop/Bestsellers";
import Header from "@/components/shop/Header";
import { CategorySection } from "@/components/shop/CategorySection";
import { getHomeCatalog } from "@/lib/catalog/home";
import { getHomeBanner } from "@/lib/site/banner";

export default async function Page() {
  const [catalog, banner] = await Promise.all([
    getHomeCatalog(),
    getHomeBanner(),
  ]);
  const categories = catalog.categories ?? [];
  const productsBySlug = catalog.productsBySlug ?? {};
  const featured = catalog.featured ?? [];

  return (
    <div>
      <Header
        banner={banner.image_url}
        href={banner.href}
        title={banner.title || "LIQUIDNIY"}
      />
      <div className="mt-2">
        <Bestsellers products={featured} />
      </div>
      <div className="mt-2">
        <CategorySection
          categories={categories}
          productsBySlug={productsBySlug}
        />
      </div>
    </div>
  );
}
