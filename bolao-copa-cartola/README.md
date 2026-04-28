# Sistema de Bolão da Copa - estilo Cartola

## O que já vem pronto
- Login de participantes via Supabase Auth.
- Cadastro próprio de participante.
- Recuperação de senha pelo Supabase.
- Perfil administrador.
- Tela de palpites com cards: Bandeira + País + placar + País + Bandeira.
- Todos podem ver palpites de todos.
- Participante só altera o próprio palpite.
- Bloqueio global por data: padrão 01/06/2026 23:59:59.
- Ranking automático pela regra definida.
- Painel Admin para configuração, seleções e jogos.
- Proteção no banco por RLS, não apenas na tela.

## Como rodar no PC
1. Instale Node.js.
2. Crie um projeto no Supabase.
3. No Supabase, abra SQL Editor e execute `schema_supabase.sql`.
4. Copie `.env.example` para `.env` e preencha:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
5. No terminal:
   ```bash
   npm install
   npm run dev
   ```
6. Abra o endereço mostrado, geralmente http://localhost:5173

## Tornar seu login administrador
Depois de criar sua conta no sistema, rode no SQL Editor:
```sql
update participantes set perfil='admin' where email='seuemail@exemplo.com';
```

## Publicar na internet
Depois que estiver funcionando no PC, publique na Vercel e configure as mesmas variáveis de ambiente.
