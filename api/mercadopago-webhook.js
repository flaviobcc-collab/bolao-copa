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
      return res.status(200).json({
        received: true,
        message: 'Notificação recebida sem paymentId.'
      });
    }

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(200).json({
        received: true,
        error: payment
      });
    }

    const userId = payment.external_reference;

    if (!userId) {
      return res.status(200).json({
        received: true,
        message: 'Pagamento sem external_reference.'
      });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const updateData = {
      pagamento_id: String(payment.id),
      pagamento_valor: payment.transaction_amount
    };

    if (payment.status === 'approved') {
      updateData.pagamento_status = 'confirmado';
      updateData.pagamento_confirmado_em = new Date().toISOString();
    } else if (payment.status === 'pending') {
      updateData.pagamento_status = 'pendente';
    } else {
      updateData.pagamento_status = payment.status || 'pendente';
    }

    const { error } = await supabaseAdmin
      .from('participantes')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      return res.status(200).json({
        received: true,
        supabase_error: error
      });
    }

    return res.status(200).json({
      received: true,
      payment_id: payment.id,
      status: payment.status,
      user_id: userId
    });
  } catch (error) {
    return res.status(200).json({
      received: true,
      error: error.message
    });
  }
}
