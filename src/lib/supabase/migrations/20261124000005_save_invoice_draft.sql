-- Enregistre un brouillon de facture (en-tête + lignes) en une seule transaction.
-- Exécutée avec les droits de l'utilisateur (RLS appliqué) : elle ne peut rien faire
-- que l'utilisateur ne pourrait faire directement.
create function public.save_invoice_draft(
  p_invoice_id uuid,      -- NULL pour créer un nouveau brouillon
  p_customer_id uuid,
  p_issue_date date,
  p_due_date date,
  p_notes text,
  p_items jsonb           -- [{description, quantity, unit_price, tax_rate}], montants en entiers
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid;
  v_cur text;
  v_id uuid;
  v_subtotal bigint;
  v_tax bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Ajoutez au moins une ligne à la facture';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Une facture ne peut pas dépasser 100 lignes';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(item)
    where coalesce(trim(e.item->>'description'), '') = ''
  ) then
    raise exception 'Chaque ligne doit avoir une description';
  end if;

  -- Le client doit être visible par l'utilisateur (RLS) et non archivé
  select c.organization_id into v_org
  from public.customers c
  where c.id = p_customer_id and c.archived_at is null;
  if v_org is null then
    raise exception 'Client introuvable';
  end if;

  select o.currency into v_cur from public.organizations o where o.id = v_org;

  if p_invoice_id is null then
    insert into public.invoices
      (organization_id, customer_id, status, issue_date, due_date, currency, notes)
    values
      (v_org, p_customer_id, 'draft', p_issue_date, p_due_date, v_cur, p_notes)
    returning id into v_id;
  else
    update public.invoices
    set customer_id = p_customer_id,
        issue_date = p_issue_date,
        due_date = p_due_date,
        notes = p_notes
    where id = p_invoice_id and organization_id = v_org and status = 'draft'
    returning id into v_id;

    if v_id is null then
      raise exception 'Brouillon introuvable';
    end if;

    delete from public.invoice_items where invoice_id = v_id;
  end if;

  insert into public.invoice_items
    (invoice_id, position, description, quantity, unit_price, tax_rate)
  select v_id,
         e.ord::int,
         trim(e.item->>'description'),
         (e.item->>'quantity')::numeric,
         (e.item->>'unit_price')::bigint,
         (e.item->>'tax_rate')::numeric
  from jsonb_array_elements(p_items) with ordinality as e(item, ord);

  -- Totaux d'un brouillon : recalculés ici, comme à l'émission (TVA arrondie ligne par ligne)
  select coalesce(sum(round(quantity * unit_price)), 0)::bigint,
         coalesce(sum(round(quantity * unit_price * tax_rate / 100)), 0)::bigint
    into v_subtotal, v_tax
  from public.invoice_items
  where invoice_id = v_id;

  update public.invoices
  set subtotal = v_subtotal, tax_total = v_tax, total = v_subtotal + v_tax
  where id = v_id;

  return v_id;
end;
$$;

revoke execute on function public.save_invoice_draft(uuid, uuid, date, date, text, jsonb) from public, anon;
grant execute on function public.save_invoice_draft(uuid, uuid, date, date, text, jsonb) to authenticated;