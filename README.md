# Bolão Esportivo v10

Versão com UI estilo cards, ranking, calendário por data, status dos jogos e controle administrativo.

## O que mudou na v10

- Cards de jogos mais visuais e responsivos.
- Calendário agrupado por data.
- Status de partida: `AGUARDANDO`, `EM_ANDAMENTO`, `FINALIZADO`.
- Admin > Jogos com botões: iniciar, finalizar e resetar.
- Reset limpa os gols e volta a partida para aguardando.
- Bloqueio de palpites quando:
  - a data limite global passou; ou
  - a partida não está mais em `AGUARDANDO`.
- Data limite padrão: `01/06/2026 23:59:59` em Brasília, editável em Admin > Configuração.

## SQL que deve rodar agora

Se você já está com a v9 funcionando, rode apenas:

```sql
patch_supabase_v10.sql
```

Esse patch não apaga seus dados.

Se for instalar do zero, use:

```sql
schema_supabase_v10.sql
```

## Deploy

Substitua os arquivos do projeto no GitHub/Vercel por esta pasta.
Depois rode o patch no Supabase e atualize o site com Ctrl + F5.
