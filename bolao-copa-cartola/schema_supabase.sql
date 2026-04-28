-- Execute este arquivo no Supabase SQL Editor.
create table if not exists configuracao_bolao (
  id int primary key default 1,
  nome text not null default 'Copa 2026',
  qtd_selecoes int default 48,
  qtd_grupos int default 12,
  limite_palpite timestamptz default '2026-06-01 23:59:59-03',
  created_at timestamptz default now()
);
insert into configuracao_bolao(id,nome,qtd_selecoes,qtd_grupos,limite_palpite)
values (1,'Copa 2026',48,12,'2026-06-01 23:59:59-03')
on conflict (id) do nothing;

create table if not exists participantes (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  perfil text not null default 'participante' check (perfil in ('admin','participante')),
  created_at timestamptz default now()
);

create table if not exists selecoes (
  id bigserial primary key,
  nome text not null,
  codigo_bandeira text,
  grupo text not null,
  created_at timestamptz default now()
);

create table if not exists jogos (
  id bigserial primary key,
  grupo text not null,
  time_a_id bigint references selecoes(id) on delete restrict,
  time_b_id bigint references selecoes(id) on delete restrict,
  data_hora timestamptz not null,
  gols_a int null,
  gols_b int null,
  created_at timestamptz default now()
);

create table if not exists palpites (
  id bigserial primary key,
  participante_id uuid references participantes(id) on delete cascade,
  jogo_id bigint references jogos(id) on delete cascade,
  gols_a int not null check (gols_a >= 0),
  gols_b int not null check (gols_b >= 0),
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
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table configuracao_bolao enable row level security;
alter table participantes enable row level security;
alter table selecoes enable row level security;
alter table jogos enable row level security;
alter table palpites enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from participantes where id = auth.uid() and perfil = 'admin')
$$;
create or replace function palpites_abertos() returns boolean language sql stable as $$
  select now() <= (select limite_palpite from configuracao_bolao where id=1)
$$;

create policy "todos logados veem configuracao" on configuracao_bolao for select to authenticated using (true);
create policy "admin altera configuracao" on configuracao_bolao for all to authenticated using (is_admin()) with check (is_admin());

create policy "todos logados veem participantes" on participantes for select to authenticated using (true);
create policy "usuario edita proprio perfil" on participantes for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "admin gerencia participantes" on participantes for all to authenticated using (is_admin()) with check (is_admin());

create policy "todos logados veem selecoes" on selecoes for select to authenticated using (true);
create policy "admin gerencia selecoes" on selecoes for all to authenticated using (is_admin()) with check (is_admin());

create policy "todos logados veem jogos" on jogos for select to authenticated using (true);
create policy "admin gerencia jogos" on jogos for all to authenticated using (is_admin()) with check (is_admin());

create policy "todos logados veem palpites" on palpites for select to authenticated using (true);
create policy "participante cria proprio palpite antes limite" on palpites for insert to authenticated with check (participante_id=auth.uid() and palpites_abertos());
create policy "participante altera proprio palpite antes limite" on palpites for update to authenticated using (participante_id=auth.uid() and palpites_abertos()) with check (participante_id=auth.uid() and palpites_abertos());
create policy "admin gerencia palpites" on palpites for all to authenticated using (is_admin()) with check (is_admin());

-- Para tornar seu usuário administrador, depois de criar seu login, execute trocando o e-mail:
-- update participantes set perfil='admin' where email='seuemail@exemplo.com';
