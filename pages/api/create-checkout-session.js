// pages/api/create-checkout-session.js
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.error('⚠️ Geen STRIPE_SECRET_KEY gevonden')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15',
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const {
    amount,           // in centen
    metadata = {},    // bijv. { donationId, url, foto_url }
    success_url,      // volledige URL met ?session_id={CHECKOUT_SESSION_ID}
    cancel_url        // volledige URL
  } = req.body

  if (!amount || !success_url || !cancel_url) {
    return res
      .status(400)
      .json({ error: 'amount, success_url en cancel_url zijn verplicht.' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: [
        'card',
        'ideal',
        'bancontact',
        'eps'
      ],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Donation to E-Wall of Fame',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: success_url.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}'),
      cancel_url,
    })

    return res.status(200).json({ sessionId: session.id })
  } catch (err) {
    console.error('💥 Stripe Checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}