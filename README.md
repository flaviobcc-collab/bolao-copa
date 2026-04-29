# Sistema Bolão Esportivo Web v9

Versão completa baseada na v8, com calendário da fase de grupos da Copa do Mundo FIFA 2026.

## Principais mudanças da v9

- 72 jogos da fase de grupos cadastrados no SQL.
- Datas e horários em Brasília (BRT / UTC-3).
- Calendário agrupado por data, não por rodada.
- Campos adicionais em jogos: `partida_numero`, `estadio` e `cidade`.
- Visual responsivo melhorado para celular.
- Cards de jogos com local do estádio.
- Ranking preservado com a regra corrigida de pontuação.

## Como subir no GitHub/Vercel

1. Substitua os arquivos do projeto antigo pelos arquivos desta pasta.
2. No Supabase, execute o arquivo `schema_supabase_v9.sql` no SQL Editor.
3. Confira se as variáveis da Vercel continuam configuradas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Faça deploy normalmente.

## Observação importante

O arquivo SQL recria as tabelas do bolão. Ele preserva os usuários do `auth.users`, mas limpa jogos, palpites e configurações antigas do bolão.

Fonte da agenda: tabela oficial FIFA 2026, conferida em 29/04/2026. Os horários foram convertidos para Brasília.
