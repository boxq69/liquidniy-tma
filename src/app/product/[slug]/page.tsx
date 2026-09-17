import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/shop/ProductView";
import { toProductCard } from "@/lib/catalog/map";
import { getShopProductDetail } from "@/lib/catalog/shop";
import { listProducts } from "@/lib/catalog/queries";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProductDetail(slug).catch(() => null);
  if (!product) return { title: "Товар" };
  return {
    title: product.title,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, relatedRows] = await Promise.all([
    getShopProductDetail(slug).catch(() => null),
    listProducts({ featured: true }).catch(() => []),
  ]);

  if (!product) notFound();

  const related = relatedRows
    .filter((item) => item.slug !== slug)
    .slice(0, 10)
    .map(toProductCard);

  return <ProductView product={product} related={related} />;
}
