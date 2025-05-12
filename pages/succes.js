// pages/success.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadStripe } from '@stripe/stripe-js'

export default function Success() {
  const router = useRouter()
  const { session_id } = router.query
  const [loading, setLoading] = useState(true)
  const [donation, setDonation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!session_id) return

    async function verifyAndLoad() {
      try {
        // 1) Haal de Checkout Session op via je eigen API
        const resp = await fetch(`/api/checkout-session?session_id=${session_id}`)
        const { session, error: sessionError } = await resp.json()
        if (sessionError || !session) throw new Error(sessionError || 'Geen sessie gevonden')

        // 2) Haal donationId uit metadata
        const donationId = session.metadata.donationId

        // 3) Update status naar 'paid' in Supabase
        const { error: updateError } = await supabase
          .from('donateurs')
          .update({ status: 'paid' })
          .eq('id', donationId)
        if (updateError) throw updateError

        // 4) Laad de volledige donatie
        const { data, error: fetchError } = await supabase
          .from('donateurs')
          .select('*')
          .eq('id', donationId)
          .single()
        if (fetchError) throw fetchError

        setDonation(data)
      } catch (err) {
        console.error(err)
        setErrorMsg(err.message)
      } finally {
        setLoading(false)
      }
    }

    verifyAndLoad()
  }, [session_id])

  if (loading) return <p>Even wachten, we controleren je betaling…</p>
  if (errorMsg) return (
    <div className="error-page">
      <h1>Oeps!</h1>
      <p>Er ging iets mis: {errorMsg}</p>
      <button onClick={() => router.push('/')}>Terug naar home</button>
    </div>
  )

  return (
    <div className="success-page">
      <h1>Bedankt voor je donatie, {donation.naam}!</h1>
      <p>We hebben je donatie van €{donation.bedrag} ontvangen.</p>
      {donation.foto_url && (
        <img src={donation.foto_url} alt="Jouw upload" style={{ maxWidth: '100%' }} />
      )}
      {donation.url && (
        <p>Link: <a href={donation.url} target="_blank" rel="noopener noreferrer">{donation.url}</a></p>
      )}
      <button onClick={() => router.push('/')}>Terug naar home</button>
    </div>
  )
}