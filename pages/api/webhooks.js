// pages/api/webhooks.js

import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    const buf = await buffer(req)
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('⚠️  Webhook signature mismatch.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Alleen bij succesvolle checkout-sessie
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const donationId = session.metadata.donationId

    const { error } = await supabaseAdmin
      .from('donateurs')
      .update({ status: 'paid' })
      .eq('id', donationId)

    if (error) {
      console.error('Supabase update error:', error)
      // Je kunt hier eventueel nog een 500 teruggeven of een retry-triggeren
    }
  }

  // Succesvolle ontvangst terugmelden aan Stripe
  res.status(200).json({ received: true })
}