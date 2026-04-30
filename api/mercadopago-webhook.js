import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body || {};
    const paymentId =
      body?.data?.id ||
      req.query?.['data.id'] ||
      req.query?.id;

    if (!paymentId) {
      return res.status(200).json({ received: true, message: 'Sem paymentId.' });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(200).json({ received: true, error: payment });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const userId = payment.external_reference;

    if (payment.status === 'approved' && userId) {
      await supabaseAdmin
        .from('participantes')
        .update({
          pagamento_status: 'confirmado',
          pagamento_confirmado_em: new Date().toISOString(),
          pagamento_id: String(payment.id),
          pagamento_valor: payment.transaction_amount
        })
        .eq('id', userId);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(200).json({ received: true, error: error.message });
  }
}
