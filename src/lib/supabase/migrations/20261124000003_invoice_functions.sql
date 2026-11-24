-- =========================
-- Émettre une facture
-- =========================
create function public.issue_invoice(p_invoice_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invoices%rowtype;
  v_org public.organizations%rowtype;
  v_cust public.customers%rowtype;
  v_subtotal bigint;
  v_tax bigint;
  v_issue date;
  v_due date;
  v_number text;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- Verrou sur la facture : empêche une double émission simultanée
  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found or not public.is_member(v_inv.organization_id) then
    raise exception 'Facture introuvable';
  end if;
  if v_inv.status <> 'draft' then
    raise exception 'Seul un brouillon peut être émis';
  end if;

  -- Verrou sur l''organisation : les numéros sont attribués l''un après l''autre
  select * into v_org from public.organizations
  where id = v_inv.organization_id for update;

  if coalesce(trim(v_org.tax_id), '') = ''
     or coalesce(trim(v_org.registration_number), '') = ''
     or coalesce(trim(v_org.address), '') = '' then
    raise exception 'Renseignez le NIU, le RCCM et l''adresse de l''entreprise avant d''émettre une facture';
  end if;

  if not exists (select 1 from public.invoice_items where invoice_id = p_invoice_id) then
    raise exception 'Ajoutez au moins une ligne à la facture';
  end if;

  select * into v_cust from public.customers where id = v_inv.customer_id;

  -- Totaux recalculés depuis les lignes, TVA arrondie ligne par ligne
  select coalesce(sum(round(quantity * unit_price)), 0)::bigint,
         coalesce(sum(round(quantity * unit_price * tax_rate / 100)), 0)::bigint
    into v_subtotal, v_tax
  from public.invoice_items
  where invoice_id = p_invoice_id;

  v_issue := coalesce(v_inv.issue_date, current_date);
  v_due := coalesce(v_inv.due_date, v_issue + v_org.payment_terms_days);
  if v_due < v_issue then
    raise exception 'L''échéance ne peut pas précéder la date d''émission';
  end if;

  -- Numéro continu : préfixe + année + compteur, ex. F2026-015
  v_number := v_org.invoice_prefix
              || extract(year from v_issue)::int::text
              || '-' || lpad(v_org.next_invoice_number::text, 3, '0');

  update public.organizations
  set next_invoice_number = next_invoice_number + 1
  where id = v_org.id;

  update public.invoices
  set status = 'issued',
      number = v_number,
      issue_date = v_issue,
      due_date = v_due,
      subtotal = v_subtotal,
      tax_total = v_tax,
      total = v_subtotal + v_tax,
      seller_snapshot = jsonb_build_object(
        'name', v_org.name,
        'legal_name', v_org.legal_name,
        'address', v_org.address,
        'phone', v_org.phone,
        'email', v_org.email,
        'tax_id', v_org.tax_id,
        'registration_number', v_org.registration_number,
        'logo_url', v_org.logo_url,
        'payment_instructions', v_org.payment_instructions
      ),
      customer_snapshot = jsonb_build_object(
        'name', v_cust.name,
        'email', v_cust.email,
        'phone', v_cust.phone,
        'address', v_cust.address,
        'tax_id', v_cust.tax_id
      )
  where id = p_invoice_id;

  return v_number;
end;
$$;

-- =========================
-- Marquer une facture comme payée
-- =========================
create function public.mark_invoice_paid(
  p_invoice_id uuid,
  p_paid_at timestamptz default now()
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invoices%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found or not public.is_member(v_inv.organization_id) then
    raise exception 'Facture introuvable';
  end if;
  if v_inv.status <> 'issued' then
    raise exception 'Seule une facture émise peut être marquée comme payée';
  end if;

  update public.invoices
  set status = 'paid', paid_at = p_paid_at
  where id = p_invoice_id;
end;
$$;

-- =========================
-- Annuler une facture émise
-- =========================
create function public.void_invoice(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invoices%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found or not public.is_member(v_inv.organization_id) then
    raise exception 'Facture introuvable';
  end if;
  if v_inv.status <> 'issued' then
    raise exception 'Seule une facture émise et non payée peut être annulée';
  end if;

  update public.invoices
  set status = 'void'
  where id = p_invoice_id;
end;
$$;

-- =========================
-- Droits : jamais pour les visiteurs non connectés
-- =========================
revoke execute on function public.issue_invoice(uuid) from public, anon;
revoke execute on function public.mark_invoice_paid(uuid, timestamptz) from public, anon;
revoke execute on function public.void_invoice(uuid) from public, anon;

grant execute on function public.issue_invoice(uuid) to authenticated;
grant execute on function public.mark_invoice_paid(uuid, timestamptz) to authenticated;
grant execute on function public.void_invoice(uuid) to authenticated;