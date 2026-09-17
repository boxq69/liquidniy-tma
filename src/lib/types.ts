export type OrderStatus = "new" | "processing" | "done" | "cancelled";

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
  show_on_home: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  price_uah: number;
  stock: number;
  sku: string | null;
};

export type Product = {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductWithDetails = Product & {
  category?: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  min_price?: number;
  sale_price?: number;
  in_stock?: boolean;
  promotion?: AppliedPromotion | null;
};

export type DiscountType = "percent" | "fixed";
export type AppliesTo = "all" | "categories" | "products";

export type AppliedPromotion = {
  id: string;
  name: string;
  badge_text: string;
  discount_type: DiscountType;
  discount_value: number;
};

export type Promotion = {
  id: string;
  name: string;
  description: string;
  badge_text: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: AppliesTo;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  stack_with_promo: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  product_ids: string[];
  category_ids: string[];
};

export type PromoCode = {
  id: string;
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_uah: number;
  max_discount_uah: number | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  first_order_only: boolean;
  combinable_with_sale: boolean;
  applies_to: AppliesTo;
  created_at: string;
  updated_at: string;
  product_ids: string[];
  category_ids: string[];
  used_count: number;
};

export type PromoPreview = {
  subtotalUah: number;
  discountUah: number;
  totalUah: number;
  promoCode: string | null;
  message: string | null;
};

export type Profile = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url?: string | null;
  is_blocked?: boolean;
  created_at?: string;
};

export type AdminUser = Profile & {
  is_admin: boolean;
  is_env_admin: boolean;
  orders_count: number;
};

export type StatsRange = "7d" | "30d" | "90d" | "365d" | "all";

export type AdminStatsPoint = {
  date: string;
  label: string;
  orders: number;
  revenue: number;
  users: number;
};

export type AdminStats = {
  range: StatsRange;
  from: string;
  to: string;
  users: number;
  blockedUsers: number;
  orders: {
    total: number;
    new: number;
    processing: number;
    done: number;
    cancelled: number;
  };
  revenueUah: number;
  products: {
    total: number;
    active: number;
    featured: number;
    lowStock: number;
  };
  categories: {
    total: number;
    visible: number;
    onHome: number;
  };
  promotions: {
    total: number;
    live: number;
  };
  promoCodes: {
    total: number;
    active: number;
  };
  period: {
    orders: number;
    revenueUah: number;
    users: number;
    aovUah: number;
  };
  previous: {
    orders: number;
    revenueUah: number;
    users: number;
  };
  series: AdminStatsPoint[];
  statusBreakdown: Array<{
    status: OrderStatus;
    count: number;
  }>;
};

export type SessionUser = {
  profileId: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
};

export type CartItemPayload = {
  variantId: string;
  qty: number;
};

export type CartLine = {
  variantId: string;
  qty: number;
  productId: string;
  title: string;
  slug: string;
  size: string;
  color: string;
  priceUah: number;
  stock: number;
  imageUrl: string | null;
};

export type Order = {
  id: string;
  profile_id: string;
  status: OrderStatus;
  total_uah: number;
  subtotal_uah?: number | null;
  discount_uah?: number;
  promo_code?: string | null;
  customer_name: string;
  customer_phone: string;
  comment: string;
  telegram_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string | null;
  title_snapshot: string;
  size_snapshot: string;
  color_snapshot: string;
  price_uah: number;
  original_price_uah?: number | null;
  qty: number;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
  profile?: Profile | null;
};

export type ProductSort = "relevance" | "price_asc" | "price_desc" | "newest";

export type ProductFilters = {
  category?: string;
  size?: string;
  sizes?: string[];
  color?: string;
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  q?: string;
  sort?: ProductSort;
};

export type CatalogFilterMeta = {
  sizes: string[];
  clothingSizes: string[];
  shoeSizes: string[];
  otherSizes: string[];
  colors: string[];
  categories: Array<{ slug: string; name: string }>;
  minPrice: number;
  maxPrice: number;
};

export type SiteBanner = {
  slot: string;
  image_url: string;
  href: string;
  title: string;
  is_active: boolean;
};
