V10.5 - Admin Usuários

1) Substitua os arquivos no GitHub e aguarde o deploy da Vercel.
2) Rode no Supabase SQL Editor:
   patch_supabase_v10_5.sql

3) Para o botão EXCLUIR remover também no Supabase Auth, publique a Edge Function:
   supabase/functions/admin-delete-user/index.ts

Pelo Supabase CLI:
   supabase functions deploy admin-delete-user

Garanta que a Edge Function tenha acesso ao secret:
   SUPABASE_SERVICE_ROLE_KEY

Mesmo se a Edge Function ainda não estiver publicada, o botão Excluir marcará o usuário como inativo/excluído na tabela participantes, o que já impede palpites e força logout automático no frontend.
