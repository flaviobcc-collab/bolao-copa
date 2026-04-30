export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email, nome } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'E-mail obrigatório para gerar Pix.' });
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: 20,
        description: 'Participação Bolão da Copa 2026',
        payment_method_id: 'pix',
        payer: {
          email: email,
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

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
