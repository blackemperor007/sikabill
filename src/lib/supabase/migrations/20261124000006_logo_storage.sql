-- Espace de stockage des logos : public en lecture, 1 Mo maximum, PNG et JPG uniquement
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Un fichier est rangé dans un dossier portant l'identifiant de l'entreprise :
-- logos/<id de l'entreprise>/logo-<horodatage>.png
-- Cette fonction vérifie que l'utilisateur est propriétaire de l'entreprise du dossier.
create function public.can_manage_logo(object_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_org uuid;
begin
  begin
    v_org := ((storage.foldername(object_name))[1])::uuid;
  exception when others then
    return false;  -- le premier dossier n'est pas un identifiant valide
  end;
  return public.is_owner(v_org);
end;
$$;

revoke execute on function public.can_manage_logo(text) from public, anon;
grant execute on function public.can_manage_logo(text) to authenticated;

-- Seul le propriétaire peut déposer un fichier dans le dossier de son entreprise.
-- La lecture n'a pas besoin de règle : l'espace est public.
create policy "Les propriétaires ajoutent le logo de leur organisation"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.can_manage_logo(name));