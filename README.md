# Bolão Copa Cartola v5

## Subir no GitHub
Envie estes arquivos diretamente na raiz do repositório:

- index.html
- package.json
- src/
- schema_supabase_v5.sql
- README.md

Não coloque tudo dentro de uma subpasta.

## Vercel
Configure:

- Root Directory: ./
- Framework Preset: Vite
- Install Command: npm install
- Build Command: npm run build
- Output Directory: dist

Environment Variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Supabase
Execute o conteúdo de `schema_supabase_v5.sql` no SQL Editor.
Depois vá em `participantes` e mude seu perfil para `admin`.
