import { OrderDetailView } from "@/components/shop/OrderDetailView";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfileOrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}
