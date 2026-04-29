-- Bolao Copa Cartola v4 - schema completo
-- Atenção: limpa dados de palpites, jogos, seleções, grupos e configuração. Mantém usuários do Auth.

create extension if not exists pgcrypto;

drop table if exists public.palpites cascade;
drop table if exists public.jogos cascade;
drop table if exists public.selecoes cascade;
drop table if exists public.grupos cascade;
drop table if exists public.configuracao_bolao cascade;
drop table if exists public.participantes cascade;

create table public.participantes (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  perfil text not null default 'participante',
  created_at timestamptz default now()
);

create table public.configuracao_bolao (
  id int primary key default 1,
  nome text not null default 'Bolão Copa 2026',
  total_selecoes int not null default 48,
  total_grupos int not null default 12,
  selecoes_por_grupo int not null default 4,
  limite_palpite timestamptz not null default '2026-06-01 23:59:59-03',
  updated_at timestamptz default now()
);

insert into public.configuracao_bolao(id,nome,total_selecoes,total_grupos,selecoes_por_grupo,limite_palpite)
values (1,'Bolão Copa 2026',48,12,4,'2026-06-01 23:59:59-03');

create table public.grupos (
  id bigserial primary key,
  nome text not null unique,
  ordem int,
  created_at timestamptz default now()
);

create table public.selecoes (
  id bigserial primary key,
  nome text not null,
  codigo_bandeira text,
  grupo text references public.grupos(nome) on delete set null,
  created_at timestamptz default now(),
  unique(nome)
);

create table public.jogos (
  id bigserial primary key,
  grupo text references public.grupos(nome) on delete set null,
  rodada int default 1,
  selecao_a_id bigint references public.selecoes(id) on delete restrict,
  selecao_b_id bigint references public.selecoes(id) on delete restrict,
  data_hora timestamptz,
  gols_a int,
  gols_b int,
  status text default 'aberto',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint selecoes_diferentes check (selecao_a_id <> selecao_b_id)
);

create table public.palpites (
  id bigserial primary key,
  participante_id uuid references public.participantes(id) on delete cascade,
  jogo_id bigint references public.jogos(id) on delete cascade,
  gols_a int not null,
  gols_b int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participante_id, jogo_id)
);

insert into public.grupos(nome,ordem) values
('A',1),('B',2),('C',3),('D',4),('E',5),('F',6),('G',7),('H',8),('I',9),('J',10),('K',11),('L',12);

insert into public.selecoes (nome, codigo_bandeira, grupo) values
('México','mx','A'),('África do Sul','za','A'),('Coreia do Sul','kr','A'),('República Tcheca','cz','A'),
('Canadá','ca','B'),('Bósnia e Herzegovina','ba','B'),('Catar','qa','B'),('Suíça','ch','B'),
('Brasil','br','C'),('Marrocos','ma','C'),('Escócia','gb-sct','C'),('Haiti','ht','C'),
('Estados Unidos','us','D'),('Austrália','au','D'),('Paraguai','py','D'),('Turquia','tr','D'),
('Alemanha','de','E'),('Equador','ec','E'),('Costa do Marfim','ci','E'),('Curaçao','cw','E'),
('Holanda','nl','F'),('Japão','jp','F'),('Suécia','se','F'),('Tunísia','tn','F'),
('Bélgica','be','G'),('Irã','ir','G'),('Egito','eg','G'),('Nova Zelândia','nz','G'),
('Espanha','es','H'),('Uruguai','uy','H'),('Arábia Saudita','sa','H'),('Cabo Verde','cv','H'),
('França','fr','I'),('Senegal','sn','I'),('Noruega','no','I'),('Iraque','iq','I'),
('Argentina','ar','J'),('Argélia','dz','J'),('Áustria','at','J'),('Jordânia','jo','J'),
('Portugal','pt','K'),('Colômbia','co','K'),('Uzbequistão','uz','K'),('República Democrática do Congo','cd','K'),
('Inglaterra','gb-eng','L'),('Croácia','hr','L'),('Gana','gh','L'),('Panamá','pa','L');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participantes(id,nome,email,perfil)
  values(new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email, 'participante')
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.participantes(id,nome,email,perfil)
select id, coalesce(raw_user_meta_data->>'nome', split_part(email,'@',1)), email, 'participante'
from auth.users on conflict(id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from public.participantes where id = auth.uid() and perfil = 'admin');
$$;

create or replace function public.palpites_abertos()
returns boolean language sql stable as $$
  select now() <= (select limite_palpite from public.configuracao_bolao where id = 1);
$$;

alter table public.participantes enable row level security;
alter table public.configuracao_bolao enable row level security;
alter table public.grupos enable row level security;
alter table public.selecoes enable row level security;
alter table public.jogos enable row level security;
alter table public.palpites enable row level security;

create policy "ver participantes" on public.participantes for select to authenticated using (true);
create policy "admin gerencia participantes" on public.participantes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "usuario atualiza proprio perfil" on public.participantes for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

create policy "ver config" on public.configuracao_bolao for select to authenticated using (true);
create policy "admin config" on public.configuracao_bolao for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "ver grupos" on public.grupos for select to authenticated using (true);
create policy "admin grupos" on public.grupos for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "ver selecoes" on public.selecoes for select to authenticated using (true);
create policy "admin selecoes" on public.selecoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "ver jogos" on public.jogos for select to authenticated using (true);
create policy "admin jogos" on public.jogos for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "ver palpites" on public.palpites for select to authenticated using (true);
create policy "criar proprio palpite" on public.palpites for insert to authenticated with check (participante_id=auth.uid() and public.palpites_abertos());
create policy "editar proprio palpite" on public.palpites for update to authenticated using (participante_id=auth.uid() and public.palpites_abertos()) with check (participante_id=auth.uid() and public.palpites_abertos());
create policy "admin palpites" on public.palpites for all to authenticated using (public.is_admin()) with check (public.is_admin());
