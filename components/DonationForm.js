// components/DonationForm.js
import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadStripe } from '@stripe/stripe-js'
import { v4 as uuidv4 } from 'uuid'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.e-wall-of-fame.com'

export default function DonationForm({ isOpen, onClose }) {
  const [naam, setNaam] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUploadChange = e => {
    setImageFile(e.target.files[0] || null)
  }

  const formatAmount = value => {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : Math.round(parsed * 100)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!naam.trim() || !bedrag) {
      alert('Vul naam en bedrag in')
      return
    }
    setLoading(true)
    try {
      let foto_url = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const fileName = `${uuidv4()}.${ext}`
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('fotos')
          .upload(fileName, imageFile, { cacheControl: '3600', upsert: false, contentType: imageFile.type })
        if (storageError) throw new Error(storageError.message)
        const { data: { publicUrl }, error: publicError } = await supabase
          .storage
          .from('fotos')
          .getPublicUrl(storageData.path)
        if (publicError) throw new Error(publicError.message)
        foto_url = publicUrl
      }

      const amount = formatAmount(bedrag)
      const { data: donation, error: dbErr } = await supabase
        .from('donateurs')
        .insert({ naam: naam.trim(), bedrag: parseFloat(bedrag), url: url || null, foto_url, status: 'pending' })
        .select('id')
        .single()
      if (dbErr) throw new Error(dbErr.message)

      const stripe = await stripePromise
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          metadata: { donationId: donation.id },
          success_url: `${APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${APP_URL}/?canceled=true`
        })
      })
      const { sessionId, error } = await resp.json()
      if (error) throw new Error(error)

      onClose()
      await stripe.redirectToCheckout({ sessionId })
    } catch (err) {
      console.error(err)
      alert('Er is iets misgegaan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="donation-form-overlay">
      <form className="donation-form" onSubmit={handleSubmit} encType="multipart/form-data">
        <button type="button" className="close-btn" onClick={onClose}>×</button>
        <h3>Doneer</h3>

        <input
          type="text"
          placeholder="Je naam"
          value={naam}
          onChange={e => setNaam(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="€ bedrag"
          value={bedrag}
          onChange={e => setBedrag(e.target.value)}
          required
        />

        {/* Foto-upload */}
        <input type="file" accept="image/*" onChange={handleUploadChange} />

        <input
          type="url"
          placeholder="Optionele link (https://...)"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Even geduld...' : 'Doneer via Stripe'}
        </button>
      </form>
    </div>
  )
}
