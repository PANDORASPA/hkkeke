create extension if not exists pgcrypto;

create table if not exists public.drive_assets (
  id uuid primary key default gen_random_uuid(),
  google_drive_file_id text not null unique,
  google_drive_url text,
  thumbnail_url text,
  file_name text,
  mime_type text,
  category text,
  sub_category text,
  tags text[],
  created_at timestamptz default now()
);

create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  google_drive_file_id text,
  google_drive_url text,
  thumbnail_url text,
  prompt text,
  negative_prompt text,
  scene_asset_id uuid references public.drive_assets(id),
  girl_reference_asset_id uuid references public.drive_assets(id),
  outfit_asset_id uuid references public.drive_assets(id),
  hair_asset_id uuid references public.drive_assets(id),
  pose_asset_id uuid references public.drive_assets(id),
  girl_style text,
  hairstyle text,
  hair_color text,
  outfit text,
  expression text,
  body_type text,
  pose text,
  created_at timestamptz default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.drive_assets enable row level security;
alter table public.generated_images enable row level security;
alter table public.app_settings enable row level security;

create policy "service role manages drive assets"
on public.drive_assets
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role manages generated images"
on public.generated_images
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role manages app settings"
on public.app_settings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();
