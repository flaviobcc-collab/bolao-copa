import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { user_id, email, nome } = req.body || {};

    if (!user_id || !email) {
      return res.status(400).json({
        error: 'user_id e email são obrigatórios.'
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: 'MP_ACCESS_TOKEN não configurado na Vercel.'
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados na Vercel.'
      });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user_id}-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: 20,
        description: 'Participação Bolão da Copa 2026',
        payment_method_id: 'pix',
        external_reference: user_id,
        payer: {
          email,
          first_name: nome || 'Participante'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || data.error || 'Erro Mercado Pago',
        details: data
      });
    }

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;

    const { error: updateError } = await supabaseAdmin
      .from('participantes')
      .update({
        pagamento_status: 'pendente',
        pagamento_id: String(data.id),
        pagamento_valor: 20,
        pix_qrcode: qrCodeBase64,
        pix_copia_cola: qrCode,
        pagamento_confirmado_em: null
      })
      .eq('id', user_id);

    if (updateError) {
      return res.status(500).json({
        error: 'Pix gerado, mas não foi possível salvar no Supabase.',
        details: updateError
      });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Erro inesperado ao gerar Pix.'
    });
  }
}
