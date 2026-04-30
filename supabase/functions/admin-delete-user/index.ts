import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: callerData, error: callerError } = await userClient.auth.getUser()
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: callerProfile } = await adminClient
      .from('participantes')
      .select('perfil, ativo, deleted_at')
      .eq('id', callerData.user.id)
      .maybeSingle()

    if (!callerProfile || callerProfile.perfil !== 'admin' || callerProfile.ativo === false || callerProfile.deleted_at) {
      return new Response(JSON.stringify({ error: 'Apenas administradores ativos podem excluir usuários.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { user_id } = await req.json()
    if (!user_id || user_id === callerData.user.id) {
      return new Response(JSON.stringify({ error: 'Usuário inválido.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await adminClient
      .from('participantes')
      .update({ ativo: false, blocked_at: new Date().toISOString(), deleted_at: new Date().toISOString() })
      .eq('id', user_id)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ message: 'Usuário excluído do Auth e bloqueado no bolão.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
