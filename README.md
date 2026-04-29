# Bolão Esportivo v8

Nome do site/navegador: **Bolão Esportivo**  
Nome interno do bolão: **Bolão da Copa 2026**

## Novidades v8

- Visual mais moderno, estilo app esportivo / Cartola.
- Cards de jogos com faixa superior, placar oficial, pontuação e motivo da pontuação.
- Ranking em cards com medalhas para Top 3.
- Destaque visual para o líder.
- Mantém a lógica corrigida de pontuação da v7.
- Mantém edição de jogos da v6.

## Subir no GitHub

Envie estes arquivos diretamente na raiz do repositório:

- `index.html`
- `package.json`
- `src/`
- `schema_supabase_v8.sql`
- `README.md`

Não coloque tudo dentro de uma subpasta.

## Vercel

Configure:

- Root Directory: `./`
- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Depois faça redeploy sem cache.

## Supabase

Se você já está com a v7 funcionando, **não precisa resetar o banco**.  
O arquivo `schema_supabase_v8.sql` é mantido apenas para instalação limpa.
