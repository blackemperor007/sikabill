-- =========================
-- Clients
-- =========================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  tax_id text,                      -- NIU du client
  archived_at timestamptz,          -- NULL tant que le client est actif
  created_at timestamptz not null default now(),
  unique (id, organization_id)      -- sert à lier une facture à un client de la même organisation
);
create index on public.customers (organization_id);

-- =========================
-- Factures
-- =========================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  number text,                      -- NULL tant que brouillon
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'paid', 'void')),
  issue_date date,
  due_date date,
  paid_at timestamptz,
  currency text not null,
  subtotal bigint not null default 0,   -- montants en entiers (plus petite unité de la devise)
  tax_total bigint not null default 0,
  total bigint not null default 0,
  notes text,
  seller_snapshot jsonb,            -- copie figée à l'émission
  customer_snapshot jsonb,          -- copie figée à l'émission
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  -- le client doit appartenir à la même organisation que la facture
  foreign key (customer_id, organization_id)
    references public.customers (id, organization_id)
);
create index on public.invoices (organization_id, status);
create index on public.invoices (customer_id);

-- Met à jour updated_at automatiquement
create function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- =========================
-- Lignes de facture
-- =========================
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null,
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100)
);
create index on public.invoice_items (invoice_id);

-- =========================
-- Sécurité (RLS)
-- =========================
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

grant select, insert, update on public.customers to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;

-- Clients : les membres lisent, créent et modifient (jamais de suppression : on archive)
create policy "Les membres lisent les clients"
  on public.customers for select to authenticated
  using (public.is_member(organization_id));

create policy "Les membres créent des clients"
  on public.customers for insert to authenticated
  with check (public.is_member(organization_id));

create policy "Les membres modifient les clients"
  on public.customers for update to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

-- Factures : lecture pour les membres ; création, modification, suppression
-- uniquement tant que la facture est un brouillon sans numéro
create policy "Les membres lisent les factures"
  on public.invoices for select to authenticated
  using (public.is_member(organization_id));

create policy "Les membres créent des brouillons"
  on public.invoices for insert to authenticated
  with check (public.is_member(organization_id) and status = 'draft' and number is null);

create policy "Les membres modifient les brouillons"
  on public.invoices for update to authenticated
  using (public.is_member(organization_id) and status = 'draft')
  with check (public.is_member(organization_id) and status = 'draft' and number is null);

create policy "Les membres suppriment les brouillons"
  on public.invoices for delete to authenticated
  using (public.is_member(organization_id) and status = 'draft');

-- Lignes : lecture pour les membres ; écriture uniquement si la facture est un brouillon
create policy "Les membres lisent les lignes"
  on public.invoice_items for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and public.is_member(i.organization_id)
  ));

create policy "Les membres ajoutent des lignes aux brouillons"
  on public.invoice_items for insert to authenticated
  with check (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.status = 'draft' and public.is_member(i.organization_id)
  ));

create policy "Les membres modifient les lignes des brouillons"
  on public.invoice_items for update to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.status = 'draft' and public.is_member(i.organization_id)
  ))
  with check (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.status = 'draft' and public.is_member(i.organization_id)
  ));

create policy "Les membres suppriment les lignes des brouillons"
  on public.invoice_items for delete to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.status = 'draft' and public.is_member(i.organization_id)
  ));