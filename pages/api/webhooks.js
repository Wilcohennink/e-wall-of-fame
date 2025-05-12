import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Zet bodyParser uit zodat Next.js je raw body niet voor je omzet
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
  // Alleen POST accepteren
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  // Lees de raw body als text en zet om naar Buffer
  const rawBody = await req.text()
  const buf = Buffer.from(rawBody)

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('⚠️  Webhook signature mismatch.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handel alleen checkout.session.completed af
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const donationId = session.metadata.donationId

    const { error } = await supabaseAdmin
      .from('donateurs')
      .update({ status: 'paid' })
      .eq('id', donationId)

    if (error) {
      console.error('Supabase update error:', error)
      // eventueel: return res.status(500).send('Database update failed')
    }
  }

  // Bevestig ontvangst aan Stripe
  res.status(200).json({ received: true })
}