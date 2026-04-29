-- Sistema Bolão Esportivo v9 - Copa do Mundo 2026
-- Execute no Supabase SQL Editor.
-- A v9 já inclui os 72 jogos da fase de grupos com horários em Brasília (BRT/UTC-3).
-- Fonte da tabela: FIFA/agenda oficial publicada; conferida com tabela pública da Roadtrips em 29/04/2026.

begin;

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
  limite_palpite timestamptz not null default '2026-06-11 11:59:59-03',
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
  partida_numero int unique,
  grupo_id bigint references public.grupos(id) on delete set null,
  selecao_a_id bigint references public.selecoes(id) on delete restrict,
  selecao_b_id bigint references public.selecoes(id) on delete restrict,
  data_hora timestamptz,
  estadio text,
  cidade text,
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
  j.id, j.partida_numero, j.grupo_id, g.nome as grupo_nome, g.ordem as grupo_ordem,
  j.selecao_a_id, sa.nome as time_a, sa.codigo_bandeira as a_bandeira,
  j.selecao_b_id, sb.nome as time_b, sb.codigo_bandeira as b_bandeira,
  j.data_hora, j.estadio, j.cidade, j.gols_a, j.gols_b, j.created_at
from public.jogos j
left join public.grupos g on g.id = j.grupo_id
left join public.selecoes sa on sa.id = j.selecao_a_id
left join public.selecoes sb on sb.id = j.selecao_b_id;

insert into public.configuracao_bolao(id,nome,total_selecoes,total_grupos,selecoes_por_grupo,limite_palpite)
values (1,'Copa 2026',48,12,4,'2026-06-11 11:59:59-03');

insert into public.grupos (nome, ordem) values
('A',1),
('B',2),
('C',3),
('D',4),
('E',5),
('F',6),
('G',7),
('H',8),
('I',9),
('J',10),
('K',11),
('L',12);

insert into public.selecoes (nome, codigo_bandeira) values
('México','mx'),
('África do Sul','za'),
('Coreia do Sul','kr'),
('República Tcheca','cz'),
('Canadá','ca'),
('Bósnia e Herzegovina','ba'),
('Catar','qa'),
('Suíça','ch'),
('Brasil','br'),
('Marrocos','ma'),
('Escócia','gb-sct'),
('Haiti','ht'),
('Estados Unidos','us'),
('Austrália','au'),
('Paraguai','py'),
('Turquia','tr'),
('Alemanha','de'),
('Equador','ec'),
('Costa do Marfim','ci'),
('Curaçao','cw'),
('Holanda','nl'),
('Japão','jp'),
('Suécia','se'),
('Tunísia','tn'),
('Bélgica','be'),
('Irã','ir'),
('Egito','eg'),
('Nova Zelândia','nz'),
('Espanha','es'),
('Uruguai','uy'),
('Arábia Saudita','sa'),
('Cabo Verde','cv'),
('França','fr'),
('Senegal','sn'),
('Noruega','no'),
('Iraque','iq'),
('Argentina','ar'),
('Argélia','dz'),
('Áustria','at'),
('Jordânia','jo'),
('Portugal','pt'),
('Colômbia','co'),
('Uzbequistão','uz'),
('República Democrática do Congo','cd'),
('Inglaterra','gb-eng'),
('Croácia','hr'),
('Gana','gh'),
('Panamá','pa');

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

insert into public.jogos (partida_numero, grupo_id, selecao_a_id, selecao_b_id, data_hora, estadio, cidade)
select v.partida_numero, g.id, sa.id, sb.id, v.data_hora::timestamptz, v.estadio, v.cidade
from (values
(1,'A','México','África do Sul','2026-06-11 16:00:00-03','Estadio Azteca','Cidade do México'),
(2,'A','Coreia do Sul','República Tcheca','2026-06-11 23:00:00-03','Estadio Akron','Guadalajara'),
(3,'B','Canadá','Bósnia e Herzegovina','2026-06-12 16:00:00-03','BMO Field','Toronto'),
(4,'D','Estados Unidos','Paraguai','2026-06-12 22:00:00-03','SoFi Stadium','Los Angeles'),
(5,'C','Haiti','Escócia','2026-06-13 22:00:00-03','Gillette Stadium','Boston'),
(6,'D','Austrália','Turquia','2026-06-13 01:00:00-03','BC Place','Vancouver'),
(7,'C','Brasil','Marrocos','2026-06-13 19:00:00-03','MetLife Stadium','New York/New Jersey'),
(8,'B','Catar','Suíça','2026-06-13 16:00:00-03','Levi''s Stadium','San Francisco Bay Area'),
(9,'E','Costa do Marfim','Equador','2026-06-14 20:00:00-03','Lincoln Financial Field','Philadelphia'),
(10,'E','Alemanha','Curaçao','2026-06-14 14:00:00-03','NRG Stadium','Houston'),
(11,'F','Holanda','Japão','2026-06-14 17:00:00-03','AT&T Stadium','Dallas'),
(12,'F','Suécia','Tunísia','2026-06-14 23:00:00-03','Estadio BBVA','Monterrey'),
(13,'H','Arábia Saudita','Uruguai','2026-06-15 19:00:00-03','Hard Rock Stadium','Miami'),
(14,'H','Espanha','Cabo Verde','2026-06-15 13:00:00-03','Mercedes-Benz Stadium','Atlanta'),
(15,'G','Irã','Nova Zelândia','2026-06-15 22:00:00-03','SoFi Stadium','Los Angeles'),
(16,'G','Bélgica','Egito','2026-06-15 16:00:00-03','Lumen Field','Seattle'),
(17,'I','França','Senegal','2026-06-16 16:00:00-03','MetLife Stadium','New York/New Jersey'),
(18,'I','Iraque','Noruega','2026-06-16 19:00:00-03','Gillette Stadium','Boston'),
(19,'J','Argentina','Argélia','2026-06-16 22:00:00-03','Arrowhead Stadium','Kansas City'),
(20,'J','Áustria','Jordânia','2026-06-16 01:00:00-03','Levi''s Stadium','San Francisco Bay Area'),
(21,'L','Gana','Panamá','2026-06-17 20:00:00-03','BMO Field','Toronto'),
(22,'L','Inglaterra','Croácia','2026-06-17 17:00:00-03','AT&T Stadium','Dallas'),
(23,'K','Portugal','República Democrática do Congo','2026-06-17 14:00:00-03','NRG Stadium','Houston'),
(24,'K','Uzbequistão','Colômbia','2026-06-17 23:00:00-03','Estadio Azteca','Cidade do México'),
(25,'A','República Tcheca','África do Sul','2026-06-18 13:00:00-03','Mercedes-Benz Stadium','Atlanta'),
(26,'B','Suíça','Bósnia e Herzegovina','2026-06-18 16:00:00-03','SoFi Stadium','Los Angeles'),
(27,'B','Canadá','Catar','2026-06-18 19:00:00-03','BC Place','Vancouver'),
(28,'A','México','Coreia do Sul','2026-06-18 22:00:00-03','Estadio Akron','Guadalajara'),
(29,'C','Brasil','Haiti','2026-06-19 22:00:00-03','Lincoln Financial Field','Philadelphia'),
(30,'C','Escócia','Marrocos','2026-06-19 19:00:00-03','Gillette Stadium','Boston'),
(31,'D','Turquia','Paraguai','2026-06-20 00:00:00-03','Levi''s Stadium','San Francisco Bay Area'),
(32,'D','Estados Unidos','Austrália','2026-06-19 16:00:00-03','Lumen Field','Seattle'),
(33,'E','Alemanha','Costa do Marfim','2026-06-20 17:00:00-03','BMO Field','Toronto'),
(34,'E','Equador','Curaçao','2026-06-20 21:00:00-03','Arrowhead Stadium','Kansas City'),
(35,'F','Holanda','Suécia','2026-06-20 14:00:00-03','NRG Stadium','Houston'),
(36,'F','Tunísia','Japão','2026-06-20 01:00:00-03','Estadio BBVA','Monterrey'),
(37,'H','Uruguai','Cabo Verde','2026-06-21 19:00:00-03','Hard Rock Stadium','Miami'),
(38,'H','Espanha','Arábia Saudita','2026-06-21 13:00:00-03','Mercedes-Benz Stadium','Atlanta'),
(39,'G','Bélgica','Irã','2026-06-21 16:00:00-03','SoFi Stadium','Los Angeles'),
(40,'G','Nova Zelândia','Egito','2026-06-21 22:00:00-03','BC Place','Vancouver'),
(41,'I','Noruega','Senegal','2026-06-22 21:00:00-03','MetLife Stadium','New York/New Jersey'),
(42,'I','França','Iraque','2026-06-22 18:00:00-03','Lincoln Financial Field','Philadelphia'),
(43,'J','Argentina','Áustria','2026-06-22 14:00:00-03','AT&T Stadium','Dallas'),
(44,'J','Jordânia','Argélia','2026-06-23 00:00:00-03','Levi''s Stadium','San Francisco Bay Area'),
(45,'L','Inglaterra','Gana','2026-06-23 17:00:00-03','Gillette Stadium','Boston'),
(46,'L','Panamá','Croácia','2026-06-23 20:00:00-03','BMO Field','Toronto'),
(47,'K','Portugal','Uzbequistão','2026-06-23 14:00:00-03','NRG Stadium','Houston'),
(48,'K','Colômbia','República Democrática do Congo','2026-06-23 23:00:00-03','Estadio Akron','Guadalajara'),
(49,'C','Escócia','Brasil','2026-06-24 19:00:00-03','Hard Rock Stadium','Miami'),
(50,'C','Marrocos','Haiti','2026-06-24 19:00:00-03','Mercedes-Benz Stadium','Atlanta'),
(51,'B','Suíça','Canadá','2026-06-24 16:00:00-03','BC Place','Vancouver'),
(52,'B','Bósnia e Herzegovina','Catar','2026-06-24 16:00:00-03','Lumen Field','Seattle'),
(53,'A','República Tcheca','México','2026-06-24 22:00:00-03','Estadio Azteca','Cidade do México'),
(54,'A','África do Sul','Coreia do Sul','2026-06-24 22:00:00-03','Estadio BBVA','Monterrey'),
(55,'E','Curaçao','Costa do Marfim','2026-06-25 17:00:00-03','Lincoln Financial Field','Philadelphia'),
(56,'E','Equador','Alemanha','2026-06-25 17:00:00-03','MetLife Stadium','New York/New Jersey'),
(57,'F','Japão','Suécia','2026-06-25 20:00:00-03','AT&T Stadium','Dallas'),
(58,'F','Tunísia','Holanda','2026-06-25 20:00:00-03','Arrowhead Stadium','Kansas City'),
(59,'D','Turquia','Estados Unidos','2026-06-25 23:00:00-03','SoFi Stadium','Los Angeles'),
(60,'D','Paraguai','Austrália','2026-06-25 23:00:00-03','Levi''s Stadium','San Francisco Bay Area'),
(61,'I','Noruega','França','2026-06-26 16:00:00-03','Gillette Stadium','Boston'),
(62,'I','Senegal','Iraque','2026-06-26 16:00:00-03','BMO Field','Toronto'),
(63,'G','Egito','Irã','2026-06-27 00:00:00-03','Lumen Field','Seattle'),
(64,'G','Nova Zelândia','Bélgica','2026-06-27 00:00:00-03','BC Place','Vancouver'),
(65,'H','Cabo Verde','Arábia Saudita','2026-06-26 21:00:00-03','NRG Stadium','Houston'),
(66,'H','Uruguai','Espanha','2026-06-26 21:00:00-03','Estadio Akron','Guadalajara'),
(67,'L','Panamá','Inglaterra','2026-06-27 18:00:00-03','MetLife Stadium','New York/New Jersey'),
(68,'L','Croácia','Gana','2026-06-27 18:00:00-03','Lincoln Financial Field','Philadelphia'),
(69,'J','Argélia','Áustria','2026-06-27 23:00:00-03','Arrowhead Stadium','Kansas City'),
(70,'J','Jordânia','Argentina','2026-06-27 23:00:00-03','AT&T Stadium','Dallas'),
(71,'K','Colômbia','Portugal','2026-06-27 20:30:00-03','Hard Rock Stadium','Miami'),
(72,'K','República Democrática do Congo','Uzbequistão','2026-06-27 20:30:00-03','Mercedes-Benz Stadium','Atlanta')
) as v(partida_numero, grupo_nome, time_a, time_b, data_hora, estadio, cidade)
join public.grupos g on g.nome = v.grupo_nome
join public.selecoes sa on sa.nome = v.time_a
join public.selecoes sb on sb.nome = v.time_b
order by v.partida_numero;


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

commit;
