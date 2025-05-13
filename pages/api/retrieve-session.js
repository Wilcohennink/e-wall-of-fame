import Stripe from 'stripe';
import { supabase } from '../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'No session_id provided' });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent
    );

    if (paymentIntent.status === 'succeeded') {
      const donationId = session.metadata.donationId;
      const { error } = await supabase
        .from('donateurs')
        .update({ status: 'paid' })
        .eq('id', donationId);
      if (error) throw error;
    }

    res.status(200).json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}