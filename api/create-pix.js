export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email } = req.body;

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_amount: 20,
      description: 'Bolão Copa 2026',
      payment_method_id: 'pix',
      payer: { email }
    })
  });

  const data = await response.json();

  res.status(200).json(data);
}
