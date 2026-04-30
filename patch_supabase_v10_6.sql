-- PATCH v10.6 - Cadastro com telefone e perfil editável
-- Rode no Supabase SQL Editor depois de subir o projeto.

alter table public.participantes
add column if not exists telefone text;

-- Atualiza o trigger de criação de participante para também salvar telefone vindo do cadastro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.participantes (id, nome, email, telefone, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    'participante'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nome = coalesce(public.participantes.nome, excluded.nome),
    telefone = coalesce(public.participantes.telefone, excluded.telefone);

  return new;
end;
$$;

-- Preenche telefone em participantes quando ele já existir no metadata do Auth.
update public.participantes p
set telefone = au.raw_user_meta_data->>'telefone'
from auth.users au
where au.id = p.id
  and (p.telefone is null or p.telefone = '')
  and au.raw_user_meta_data ? 'telefone';

-- Garante índice único para evitar dois palpites do mesmo participante no mesmo jogo.
-- Se houver registros duplicados antigos, este comando pode falhar; nesse caso me avise para limparmos duplicados antes.
create unique index if not exists unique_palpite
on public.palpites (participante_id, jogo_id);
