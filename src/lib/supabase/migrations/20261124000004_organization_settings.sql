-- Seules certaines colonnes de l'organisation sont modifiables par l'utilisateur.
-- Exclues : id, created_at et next_invoice_number (le compteur de numérotation
-- n'évolue que par la fonction issue_invoice).
revoke update on public.organizations from authenticated;

grant update (
  name, legal_name, country, address, phone, email,
  tax_id, registration_number, currency, default_tax_rate,
  payment_terms_days, invoice_prefix, payment_instructions, logo_url
) on public.organizations to authenticated;

-- La devise ne peut plus changer dès qu'une facture existe
create function public.prevent_currency_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency
     and exists (select 1 from public.invoices where organization_id = old.id) then
    raise exception 'La devise ne peut plus être modifiée : des factures existent déjà.';
  end if;
  return new;
end;
$$;

create trigger organizations_prevent_currency_change
  before update on public.organizations
  for each row execute function public.prevent_currency_change();