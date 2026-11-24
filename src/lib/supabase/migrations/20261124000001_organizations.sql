-- Organisations (l'entreprise cliente de Sikabill)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  country text not null,                     -- code ISO, ex. 'CM'
  address text,
  phone text,
  email text,
  tax_id text,                               -- NIU
  registration_number text,                  -- RCCM
  currency text not null,                    -- ex. 'XAF'
  default_tax_rate numeric(5,2) not null default 0,
  logo_url text,
  payment_terms_days integer not null default 30,
  invoice_prefix text not null default 'F',
  next_invoice_number integer not null default 1,
  payment_instructions text,
  created_at timestamptz not null default now()
);

-- Appartenances : relie les utilisateurs aux organisations
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on public.memberships (user_id);

-- Fonctions d'aide pour les règles de sécurité
create function public.is_member(org_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org_id and user_id = (select auth.uid())
  );
$$;

create function public.is_owner(org_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- Création d'une organisation par un utilisateur connecté
create function public.create_organization(
  p_name text, p_country text, p_currency text, p_tax_rate numeric
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_org uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;

  insert into public.organizations (name, country, currency, default_tax_rate)
  values (p_name, p_country, p_currency, p_tax_rate)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, (select auth.uid()), 'owner');

  return v_org;
end;
$$;

-- Droits d'exécution : jamais pour les visiteurs non connectés
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
revoke execute on function public.create_organization(text, text, text, numeric) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text, numeric) to authenticated;

-- RLS : activé immédiatement
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

grant select, update on public.organizations to authenticated;
grant select on public.memberships to authenticated;

create policy "Les membres lisent leurs organisations"
  on public.organizations for select to authenticated
  using (public.is_member(id));

create policy "Les propriétaires modifient leur organisation"
  on public.organizations for update to authenticated
  using (public.is_owner(id))
  with check (public.is_owner(id));

create policy "Les membres lisent les appartenances de leurs organisations"
  on public.memberships for select to authenticated
  using (public.is_member(organization_id));