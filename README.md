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

## Novidade v6
- Admin > Jogos agora permite editar grupo, seleções, data/hora e placar oficial do jogo, além de excluir.
- Não é necessário resetar o banco se você já está na v5. O SQL v6 é mantido apenas para instalações limpas.
