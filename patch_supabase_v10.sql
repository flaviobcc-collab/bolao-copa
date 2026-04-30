-- PATCH v10 - Rode no Supabase SQL Editor antes de subir/testar a v10
-- Não apaga dados. Acrescenta status, recria jogos_view e bloqueia palpites por status/prazo.

alter table public.jogos
add column if not exists status text not null default 'AGUARDANDO';

alter table public.jogos
add column if not exists partida_numero int;

alter table public.jogos
add column if not exists estadio text;

alter table public.jogos
add column if not exists cidade text;

-- Ajusta jogos que já têm resultado para finalizado, sem mexer nos demais.
update public.jogos
set status = 'FINALIZADO'
where gols_a is not null and gols_b is not null and coalesce(status,'AGUARDANDO') = 'AGUARDANDO';

-- Recria a view usada pelo site.
drop view if exists public.jogos_view;

create view public.jogos_view as
select
  j.id,
  j.partida_numero,
  j.grupo_id,
  g.nome as grupo_nome,
  g.ordem as grupo_ordem,
  j.selecao_a_id,
  sa.nome as time_a,
  sa.codigo_bandeira as a_bandeira,
  j.selecao_b_id,
  sb.nome as time_b,
  sb.codigo_bandeira as b_bandeira,
  j.data_hora,
  j.estadio,
  j.cidade,
  j.status,
  j.gols_a,
  j.gols_b,
  j.created_at
from public.jogos j
left join public.grupos g on g.id = j.grupo_id
left join public.selecoes sa on sa.id = j.selecao_a_id
left join public.selecoes sb on sb.id = j.selecao_b_id;

create or replace function public.palpites_abertos()
returns boolean language sql stable as $$
  select now() <= (select limite_palpite from public.configuracao_bolao where id=1);
$$;

create or replace function public.palpite_liberado(p_jogo_id bigint)
returns boolean language sql stable as $$
  select public.palpites_abertos()
     and exists(
       select 1 from public.jogos j
       where j.id = p_jogo_id
       and coalesce(j.status,'AGUARDANDO') = 'AGUARDANDO'
     );
$$;

-- Substitui políticas de palpite para impedir salvar quando o jogo não estiver AGUARDANDO
-- ou quando a data limite global já tiver passado.
drop policy if exists "palpites insert proprio" on public.palpites;
drop policy if exists "palpites update proprio" on public.palpites;

create policy "palpites insert proprio"
on public.palpites
for insert
to authenticated
with check (participante_id = auth.uid() and public.palpite_liberado(jogo_id));

create policy "palpites update proprio"
on public.palpites
for update
to authenticated
using (participante_id = auth.uid() and public.palpite_liberado(jogo_id))
with check (participante_id = auth.uid() and public.palpite_liberado(jogo_id));

-- Data limite padrão que você poderá alterar depois no painel Admin > Configuração.
update public.configuracao_bolao
set limite_palpite = '2026-06-01 23:59:59-03'
where id = 1;
