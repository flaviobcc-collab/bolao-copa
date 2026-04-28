-- ATENÇÃO: este script apaga e recria as tabelas públicas do sistema.
drop table if exists public.palpites cascade;
drop table if exists public.jogos cascade;
drop table if exists public.grupo_selecoes cascade;
drop table if exists public.grupos cascade;
drop table if exists public.selecoes cascade;
drop table if exists public.configuracao_bolao cascade;
drop table if exists public.participantes cascade;

create table public.configuracao_bolao (
  id int primary key default 1,
  nome text not null default 'Copa 2026',
  total_selecoes int not null default 48,
  total_grupos int not null default 12,
  selecoes_por_grupo int not null default 4,
  limite_palpite timestamptz not null default '2026-06-01 23:59:59-03',
  created_at timestamptz default now()
);
insert into public.configuracao_bolao(id,nome,total_selecoes,total_grupos,selecoes_por_grupo,limite_palpite)
values (1,'Copa 2026',48,12,4,'2026-06-01 23:59:59-03');

create table public.participantes (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  perfil text not null default 'participante',
  bloqueado boolean not null default false,
  created_at timestamptz default now()
);

create table public.selecoes (
  id bigserial primary key,
  nome text not null,
  codigo_bandeira text not null,
  created_at timestamptz default now()
);

create table public.grupos (
  id bigserial primary key,
  nome text not null unique,
  ordem int not null,
  created_at timestamptz default now()
);

create table public.grupo_selecoes (
  id bigserial primary key,
  grupo_id bigint references public.grupos(id) on delete cascade,
  selecao_id bigint references public.selecoes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(grupo_id, selecao_id)
);

create table public.jogos (
  id bigserial primary key,
  grupo_id bigint references public.grupos(id) on delete set null,
  grupo text,
  rodada int default 1,
  selecao_a_id bigint references public.selecoes(id),
  selecao_b_id bigint references public.selecoes(id),
  data_hora timestamptz,
  gols_a int,
  gols_b int,
  status text default 'aberto',
  created_at timestamptz default now()
);

create table public.palpites (
  id bigserial primary key,
  participante_id uuid references public.participantes(id) on delete cascade,
  jogo_id bigint references public.jogos(id) on delete cascade,
  palpite_a int not null,
  palpite_b int not null,
  pontos int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participante_id, jogo_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participantes (id, nome, email, perfil)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email, 'participante')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.participantes (id,nome,email,perfil)
select id, coalesce(raw_user_meta_data->>'nome', split_part(email,'@',1)), email, 'participante'
from auth.users on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from public.participantes where id = auth.uid() and perfil = 'admin' and bloqueado=false);
$$;
create or replace function public.palpites_abertos()
returns boolean language sql stable as $$
  select now() <= (select limite_palpite from public.configuracao_bolao where id=1);
$$;

alter table public.configuracao_bolao enable row level security;
alter table public.participantes enable row level security;
alter table public.selecoes enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_selecoes enable row level security;
alter table public.jogos enable row level security;
alter table public.palpites enable row level security;

create policy "ver configuracao" on public.configuracao_bolao for select to authenticated using (true);
create policy "admin altera configuracao" on public.configuracao_bolao for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ver participantes" on public.participantes for select to authenticated using (true);
create policy "admin gerencia participantes" on public.participantes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "usuario edita proprio nome" on public.participantes for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "ver selecoes" on public.selecoes for select to authenticated using (true);
create policy "admin gerencia selecoes" on public.selecoes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ver grupos" on public.grupos for select to authenticated using (true);
create policy "admin gerencia grupos" on public.grupos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ver grupo_selecoes" on public.grupo_selecoes for select to authenticated using (true);
create policy "admin gerencia grupo_selecoes" on public.grupo_selecoes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ver jogos" on public.jogos for select to authenticated using (true);
create policy "admin gerencia jogos" on public.jogos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ver palpites" on public.palpites for select to authenticated using (true);
create policy "criar proprio palpite antes limite" on public.palpites for insert to authenticated with check (participante_id=auth.uid() and public.palpites_abertos());
create policy "editar proprio palpite antes limite" on public.palpites for update to authenticated using (participante_id=auth.uid() and public.palpites_abertos()) with check (participante_id=auth.uid() and public.palpites_abertos());
create policy "admin gerencia palpites" on public.palpites for all to authenticated using (public.is_admin()) with check (public.is_admin());
