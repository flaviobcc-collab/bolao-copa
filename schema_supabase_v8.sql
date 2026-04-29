-- Sistema Bolão Copa Cartola v5 - execute no Supabase SQL Editor
-- ATENÇÃO: limpa dados de testes em tabelas do bolão, mas preserva auth.users.

drop view if exists public.jogos_view;
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

create table public.participantes (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  perfil text not null default 'participante',
  created_at timestamptz default now()
);

create table public.selecoes (
  id bigserial primary key,
  nome text not null unique,
  codigo_bandeira text,
  created_at timestamptz default now()
);

create table public.grupos (
  id bigserial primary key,
  nome text not null unique,
  ordem int not null unique,
  created_at timestamptz default now()
);

create table public.grupo_selecoes (
  id bigserial primary key,
  grupo_id bigint not null references public.grupos(id) on delete cascade,
  selecao_id bigint not null references public.selecoes(id) on delete cascade,
  unique(grupo_id, selecao_id),
  unique(selecao_id)
);

create table public.jogos (
  id bigserial primary key,
  grupo_id bigint references public.grupos(id) on delete set null,
  selecao_a_id bigint references public.selecoes(id) on delete restrict,
  selecao_b_id bigint references public.selecoes(id) on delete restrict,
  data_hora timestamptz,
  gols_a int,
  gols_b int,
  created_at timestamptz default now(),
  check (selecao_a_id is null or selecao_b_id is null or selecao_a_id <> selecao_b_id)
);

create table public.palpites (
  id bigserial primary key,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  jogo_id bigint not null references public.jogos(id) on delete cascade,
  palpite_a int not null,
  palpite_b int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participante_id, jogo_id)
);

create view public.jogos_view as
select
  j.id, j.grupo_id, g.nome as grupo_nome, g.ordem as grupo_ordem,
  j.selecao_a_id, sa.nome as time_a, sa.codigo_bandeira as a_bandeira,
  j.selecao_b_id, sb.nome as time_b, sb.codigo_bandeira as b_bandeira,
  j.data_hora, j.gols_a, j.gols_b, j.created_at
from public.jogos j
left join public.grupos g on g.id = j.grupo_id
left join public.selecoes sa on sa.id = j.selecao_a_id
left join public.selecoes sb on sb.id = j.selecao_b_id;

insert into public.configuracao_bolao(id,nome,total_selecoes,total_grupos,selecoes_por_grupo,limite_palpite)
values (1,'Copa 2026',48,12,4,'2026-06-01 23:59:59-03');

insert into public.grupos (nome, ordem) values
('A',1),('B',2),('C',3),('D',4),('E',5),('F',6),('G',7),('H',8),('I',9),('J',10),('K',11),('L',12);

insert into public.selecoes (nome, codigo_bandeira) values
('México','mx'),('África do Sul','za'),('Coreia do Sul','kr'),('República Tcheca','cz'),
('Canadá','ca'),('Bósnia e Herzegovina','ba'),('Catar','qa'),('Suíça','ch'),
('Brasil','br'),('Marrocos','ma'),('Escócia','gb-sct'),('Haiti','ht'),
('Estados Unidos','us'),('Austrália','au'),('Paraguai','py'),('Turquia','tr'),
('Alemanha','de'),('Equador','ec'),('Costa do Marfim','ci'),('Curaçao','cw'),
('Holanda','nl'),('Japão','jp'),('Suécia','se'),('Tunísia','tn'),
('Bélgica','be'),('Irã','ir'),('Egito','eg'),('Nova Zelândia','nz'),
('Espanha','es'),('Uruguai','uy'),('Arábia Saudita','sa'),('Cabo Verde','cv'),
('França','fr'),('Senegal','sn'),('Noruega','no'),('Iraque','iq'),
('Argentina','ar'),('Argélia','dz'),('Áustria','at'),('Jordânia','jo'),
('Portugal','pt'),('Colômbia','co'),('Uzbequistão','uz'),('República Democrática do Congo','cd'),
('Inglaterra','gb-eng'),('Croácia','hr'),('Gana','gh'),('Panamá','pa');

insert into public.grupo_selecoes (grupo_id, selecao_id)
select g.id, s.id from public.grupos g join public.selecoes s on
(g.nome='A' and s.nome in ('México','África do Sul','Coreia do Sul','República Tcheca')) or
(g.nome='B' and s.nome in ('Canadá','Bósnia e Herzegovina','Catar','Suíça')) or
(g.nome='C' and s.nome in ('Brasil','Marrocos','Escócia','Haiti')) or
(g.nome='D' and s.nome in ('Estados Unidos','Austrália','Paraguai','Turquia')) or
(g.nome='E' and s.nome in ('Alemanha','Equador','Costa do Marfim','Curaçao')) or
(g.nome='F' and s.nome in ('Holanda','Japão','Suécia','Tunísia')) or
(g.nome='G' and s.nome in ('Bélgica','Irã','Egito','Nova Zelândia')) or
(g.nome='H' and s.nome in ('Espanha','Uruguai','Arábia Saudita','Cabo Verde')) or
(g.nome='I' and s.nome in ('França','Senegal','Noruega','Iraque')) or
(g.nome='J' and s.nome in ('Argentina','Argélia','Áustria','Jordânia')) or
(g.nome='K' and s.nome in ('Portugal','Colômbia','Uzbequistão','República Democrática do Congo')) or
(g.nome='L' and s.nome in ('Inglaterra','Croácia','Gana','Panamá'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participantes (id, nome, email, perfil)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email, 'participante')
  on conflict (id) do update set email=excluded.email, nome=coalesce(public.participantes.nome, excluded.nome);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.participantes (id,nome,email,perfil)
select id, coalesce(raw_user_meta_data->>'nome', split_part(email,'@',1)), email, 'participante' from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.participantes where id = auth.uid() and perfil = 'admin');
$$;
create or replace function public.palpites_abertos() returns boolean language sql stable as $$
  select now() <= (select limite_palpite from public.configuracao_bolao where id=1);
$$;

alter table public.configuracao_bolao enable row level security;
alter table public.participantes enable row level security;
alter table public.selecoes enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_selecoes enable row level security;
alter table public.jogos enable row level security;
alter table public.palpites enable row level security;

create policy "config select" on public.configuracao_bolao for select to authenticated using (true);
create policy "config admin" on public.configuracao_bolao for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "participantes select" on public.participantes for select to authenticated using (true);
create policy "participantes admin" on public.participantes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "participante atualiza proprio" on public.participantes for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "selecoes select" on public.selecoes for select to authenticated using (true);
create policy "selecoes admin" on public.selecoes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "grupos select" on public.grupos for select to authenticated using (true);
create policy "grupos admin" on public.grupos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "grupo_selecoes select" on public.grupo_selecoes for select to authenticated using (true);
create policy "grupo_selecoes admin" on public.grupo_selecoes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "jogos select" on public.jogos for select to authenticated using (true);
create policy "jogos admin" on public.jogos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "palpites select" on public.palpites for select to authenticated using (true);
create policy "palpites insert proprio" on public.palpites for insert to authenticated with check (participante_id=auth.uid() and public.palpites_abertos());
create policy "palpites update proprio" on public.palpites for update to authenticated using (participante_id=auth.uid() and public.palpites_abertos()) with check (participante_id=auth.uid() and public.palpites_abertos());
create policy "palpites admin" on public.palpites for all to authenticated using (public.is_admin()) with check (public.is_admin());
