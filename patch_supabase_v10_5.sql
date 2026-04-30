-- PATCH v10.5 - Admin de Usuários
-- Rode no Supabase SQL Editor. Não apaga dados.

alter table public.participantes
add column if not exists ativo boolean not null default true;

alter table public.participantes
add column if not exists blocked_at timestamptz;

alter table public.participantes
add column if not exists deleted_at timestamptz;

update public.participantes
set ativo = true
where ativo is null;

-- Função auxiliar: usuário atual precisa estar ativo para palpitar.
create or replace function public.usuario_ativo(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.participantes p
    where p.id = p_user_id
      and coalesce(p.ativo, true) = true
      and p.deleted_at is null
  );
$$;

-- Atualiza a regra do palpite: além do prazo e status do jogo, o usuário precisa estar ativo.
create or replace function public.palpite_liberado(p_jogo_id bigint)
returns boolean
language sql
stable
as $$
  select public.usuario_ativo(auth.uid())
     and public.palpites_abertos()
     and exists(
       select 1 from public.jogos j
       where j.id = p_jogo_id
       and coalesce(j.status,'AGUARDANDO') = 'AGUARDANDO'
     );
$$;

-- Recria políticas de palpites com bloqueio para usuário inativo.
drop policy if exists "palpites insert proprio" on public.palpites;
drop policy if exists "palpites update proprio" on public.palpites;

create policy "palpites insert proprio"
on public.palpites
for insert
to authenticated
with check (
  participante_id = auth.uid()
  and public.usuario_ativo(auth.uid())
  and public.palpite_liberado(jogo_id)
);

create policy "palpites update proprio"
on public.palpites
for update
to authenticated
using (
  participante_id = auth.uid()
  and public.usuario_ativo(auth.uid())
  and public.palpite_liberado(jogo_id)
)
with check (
  participante_id = auth.uid()
  and public.usuario_ativo(auth.uid())
  and public.palpite_liberado(jogo_id)
);

-- Garante que o próprio usuário só consiga atualizar seu perfil se estiver ativo.
drop policy if exists "participante atualiza proprio" on public.participantes;
create policy "participante atualiza proprio"
on public.participantes
for update
to authenticated
using (id = auth.uid() and public.usuario_ativo(auth.uid()))
with check (id = auth.uid() and public.usuario_ativo(auth.uid()));

-- Mantém leitura autenticada para rankings/listas.
drop policy if exists "participantes select" on public.participantes;
create policy "participantes select"
on public.participantes
for select
to authenticated
using (true);
