# Bolão Copa Cartola Web v3

## Vercel
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install
- Root Directory: bolao-copa-cartola, se esta pasta estiver dentro do repositório.

## Variáveis de ambiente
Crie as duas variáveis na Vercel:

VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

## Supabase
1. Rode o arquivo `schema_supabase_v3.sql` no SQL Editor.
2. Depois de rodar, vá em `Table Editor > participantes` e altere seu perfil para `admin`.
3. Faça redeploy na Vercel sem cache.

## Observação
Esta versão mostra mensagens de erro na tela quando algo não salva, em vez de falhar silenciosamente.
