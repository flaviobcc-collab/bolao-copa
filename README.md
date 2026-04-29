# Sistema Bolão Copa Cartola - v4

## Deploy na Vercel
Framework: Vite
Build command: npm run build
Output directory: dist
Install command: npm install

## Variáveis de ambiente
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_publishable_key

## Banco de dados
Rode `schema_supabase_v4.sql` no Supabase SQL Editor.
Depois ajuste seu usuário na tabela `participantes` para `perfil = admin`.

## Recursos v4
- Admin com menu lateral
- Configuração do bolão
- 48 seleções pré-incluídas nos grupos A-L
- Cadastro/edição/exclusão de seleções
- Grupos com visualização por cards
- Geração de jogos por grupo e todos os grupos
- Criação/edição/exclusão de jogos
- Calendário de jogos para participantes
- Meus palpites com placar oficial e pontuação
- Ver palpites com seletor de participante
- Ranking automático
- Atualizando deploy
