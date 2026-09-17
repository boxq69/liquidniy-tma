# LIQUIDNIY

Telegram Mini App store: catalog, cart, Nova Poshta checkout, and an admin panel.

Stack: Next.js 16, React 19, Supabase, Telegram WebApp SDK, shadcn/ui.

## Preview
![Desktop1](https://i.ibb.co/0yHWGnpF/Desktop-1.png)
![Desktop2](https://i.ibb.co/dsNZLmBY/Desktop-2.png)
![Desktop3](https://i.ibb.co/LXswtsyw/Desktop-3.png)

## Run locally

```bash
cp .env.example .env.local
npm install
```

Fill `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, service role (**server only**) |
| `TELEGRAM_BOT_TOKEN` | [BotFather](https://t.me/BotFather) |
| `TELEGRAM_BOT_USERNAME` | bot username without `@` |
| `SESSION_SECRET` | random string, 32+ characters |
| `ADMIN_TELEGRAM_IDS` | your numeric Telegram id ([@userinfobot](https://t.me/userinfobot)) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; HTTPS tunnel for Telegram |
| `NOVA_POSHTA_API_KEY` | optional |

Paste the schema below into the Supabase SQL editor. Create a public Storage bucket `product-images` (5 MB, jpeg/png/webp/gif).

Free Supabase projects pause after inactivity — restore the project in the [dashboard](https://supabase.com/dashboard) if the shop cannot reach the database.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `GET /api/health` should return `{ "ok": true, "supabase": true, "telegram": true }`.

Local admin (development, localhost only): [http://localhost:3000/api/dev/login](http://localhost:3000/api/dev/login)

Telegram: set the BotFather Mini App URL to an HTTPS tunnel, put that URL in `NEXT_PUBLIC_APP_URL`, then open `/api/telegram/webhook?setup=1&secret=<TELEGRAM_WEBHOOK_SECRET>` once and send `/start` to the bot.

## Database schema

```sql
create extension if not exists "pgcrypto";

create type public.order_status as enum ('new', 'processing', 'done', 'cancelled');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.admins (
  telegram_id bigint primary key,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  show_on_home boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null,
  price_uah int not null check (price_uah >= 0),
  stock int not null default 0 check (stock >= 0),
  sku text,
  created_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  unique (cart_id, variant_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'new',
  total_uah int not null check (total_uah >= 0),
  subtotal_uah integer,
  discount_uah integer not null default 0,
  promo_code text,
  customer_name text not null,
  customer_phone text not null,
  comment text not null default '',
  telegram_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  title_snapshot text not null,
  size_snapshot text not null,
  color_snapshot text not null,
  price_uah int not null check (price_uah >= 0),
  original_price_uah integer,
  qty int not null check (qty > 0)
);

create table public.favorites (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, product_id)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  badge_text text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  applies_to text not null default 'all' check (applies_to in ('all', 'categories', 'products')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  stack_with_promo boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (discount_type = 'percent' and discount_value <= 100)
    or discount_type = 'fixed'
  ),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (promotion_id, product_id)
);

create table public.promotion_categories (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (promotion_id, category_id)
);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  min_order_uah integer not null default 0 check (min_order_uah >= 0),
  max_discount_uah integer check (max_discount_uah is null or max_discount_uah > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_limit_per_user integer check (usage_limit_per_user is null or usage_limit_per_user > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  first_order_only boolean not null default false,
  combinable_with_sale boolean not null default true,
  applies_to text not null default 'all' check (applies_to in ('all', 'categories', 'products')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (discount_type = 'percent' and discount_value <= 100)
    or discount_type = 'fixed'
  ),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index promo_codes_code_lower_idx on public.promo_codes (lower(code));

create table public.promo_code_products (
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (promo_code_id, product_id)
);

create table public.promo_code_categories (
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (promo_code_id, category_id)
);

create table public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  discount_uah integer not null check (discount_uah >= 0),
  created_at timestamptz not null default now()
);

create table public.site_banners (
  slot text primary key,
  image_url text not null,
  href text not null default '/',
  title text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  check (slot in ('home')),
  check (char_length(href) between 1 and 300),
  check (char_length(title) <= 120)
);

create index products_active_idx on public.products (is_active, sort_order);
create index products_featured_idx on public.products (sort_order) where is_active and is_featured;
create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_low_stock_idx on public.product_variants (stock) where stock <= 3;
create index product_images_product_idx on public.product_images (product_id, sort_order);
create index categories_home_sort_idx on public.categories (sort_order) where is_visible and show_on_home;
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_profile_created_idx on public.orders (profile_id, created_at desc);
create index orders_promo_code_idx on public.orders (promo_code) where promo_code is not null;
create index profiles_created_idx on public.profiles (created_at desc);
create index favorites_profile_idx on public.favorites (profile_id, created_at desc);
create index promotions_live_idx on public.promotions (is_active, priority desc, created_at desc);
create index promotion_products_product_idx on public.promotion_products (product_id);
create index promotion_categories_category_idx on public.promotion_categories (category_id);
create index promo_codes_active_idx on public.promo_codes (is_active, starts_at, ends_at);
create index promo_code_products_product_idx on public.promo_code_products (product_id);
create index promo_code_categories_category_idx on public.promo_code_categories (category_id);
create index promo_code_redemptions_code_profile_idx on public.promo_code_redemptions (promo_code_id, profile_id);

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.favorites enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.promotion_categories enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_code_products enable row level security;
alter table public.promo_code_categories enable row level security;
alter table public.promo_code_redemptions enable row level security;
alter table public.site_banners enable row level security;

create policy "Public read active products"
  on public.products for select using (is_active = true);

create policy "Public read visible categories"
  on public.categories for select using (is_visible = true);

create policy "Public read variants of active products"
  on public.product_variants for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active = true
  ));

create policy "Public read images of active products"
  on public.product_images for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active = true
  ));

create policy "Public read live promotions"
  on public.promotions for select
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Public read live promotion products"
  on public.promotion_products for select
  using (exists (
    select 1 from public.promotions p
    where p.id = promotion_id and p.is_active = true
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at >= now())
  ));

create policy "Public read live promotion categories"
  on public.promotion_categories for select
  using (exists (
    select 1 from public.promotions p
    where p.id = promotion_id and p.is_active = true
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at >= now())
  ));

create policy "Public read active banners"
  on public.site_banners for select using (is_active = true);

grant select on public.site_banners to anon, authenticated;
grant select on public.promotions to anon, authenticated;
grant select on public.promotion_products to anon, authenticated;
grant select on public.promotion_categories to anon, authenticated;
```

Writes go through the Next.js server with the service role key. Catalog reads use RLS.
