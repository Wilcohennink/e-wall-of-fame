// components/DonationForm.js
import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadStripe } from '@stripe/stripe-js'
import { v4 as uuidv4 } from 'uuid'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function DonationForm({ isOpen, onClose }) {
  const [naam, setNaam] = useState('')
  const [bedrag, setBedrag] = useState('')       // lege string, nooit null/undefined
  const [imageFile, setImageFile] = useState(null)
  const [url, setUrl] = useState('')             // lege string
  const [loading, setLoading] = useState(false)

  const [camActive, setCamActive] = useState(false)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup: stop alle camera-tracks bij unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  // Check of camera beschikbaar is
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false)
    }
  }, [])

  const startCamera = async () => {
    try {
      const constraints = { video: { facingMode: { ideal: 'environment' } } }
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCamActive(true)
    } catch (err) {
      console.error('Camera-fout:', err)
      if (err.name === 'NotFoundError') {
        setCameraAvailable(false)
        alert('Geen camera gevonden op dit apparaat. Je kunt een foto uploaden.')
      } else {
        alert(`Probleem met toegang tot de camera: ${err.message}`)
      }
    }
  }

  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setImageFile(file)
    }, 'image/jpeg')

    // stop camera
    streamRef.current?.getTracks().forEach(track => track.stop())
    setCamActive(false)
  }

  const handleUploadChange = e => {
    setImageFile(e.target.files[0] || null)
  }

  const handleSubmit = async e => {
    e.preventDefault()

    // Basisvalidatie
    if (!naam.trim() || !bedrag) {
      alert('Vul je naam en een bedrag in.')
      return
    }

    // URL-validatie: alleen checken als url niet leeg is
    if (url.trim() !== '' && !/^https?:\/\//.test(url)) {
      alert('Optionele link moet beginnen met http:// of https://')
      return
    }

    setLoading(true)
    try {
      // 1) Foto uploaden (optioneel)
      let foto_url = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const fileName = `${uuidv4()}.${ext}`

        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('fotos')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type
          })
        if (storageError) throw new Error(storageError.message)

        const { data: { publicUrl }, error: publicError } = await supabase
          .storage
          .from('fotos')
          .getPublicUrl(storageData.path)
        if (publicError) throw new Error(publicError.message)

        foto_url = publicUrl
      }

      // 2) Record in database aanmaken
      const amount = Math.round(parseFloat(bedrag) * 100)
      const { data: donation, error: dbErr } = await supabase
        .from('donateurs')
        .insert({
          naam: naam.trim(),
          bedrag: parseFloat(bedrag),
          url: url.trim() || null,
          foto_url,
          status: 'pending'
        })
        .select('id')
        .single()
      if (dbErr) throw new Error(dbErr.message)

      // 3) Stripe Checkout sessie aanmaken
      const stripe = await stripePromise
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          metadata: {
            donationId: donation.id,
            url: url.trim(),
            foto_url: foto_url || ''
          },
          success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${APP_URL}/?canceled=true`
        })
      })
      const { sessionId, error } = await resp.json()
      if (error) throw new Error(error)

      // 4) Sluit modal en redirect naar Stripe
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
      <form
        className="donation-form"
        onSubmit={handleSubmit}
        encType="multipart/form-data"
      >
        <button
          type="button"
          className="close-btn"
          onClick={onClose}
        >×</button>
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

        {/* Camera startknop */}
        {cameraAvailable && !camActive && (
          <button
            type="button"
            onClick={startCamera}
            className="photo-btn"
          >
            Maak foto met camera
          </button>
        )}

        {/* Videostream en capture */}
        {camActive && (
          <>
            <video
              ref={videoRef}
              style={{ width: '100%', maxHeight: 240 }}
            />
            <button
              type="button"
              onClick={takePhoto}
              className="photo-btn"
            >
              Neem foto
            </button>
          </>
        )}

        {/* Preview van de foto */}
        <canvas
          ref={canvasRef}
          style={{
            display: imageFile ? 'block' : 'none',
            width: '100%',
            maxHeight: 240,
            marginTop: 8
          }}
        />

        {/* Fallback file-upload */}
        <input
          type="file"
          accept="image/*"
          onChange={handleUploadChange}
        />

        <input
          type="url"
          placeholder="Optionele link (https://...)"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Even geduld…' : 'Doneer via Stripe'}
        </button>
      </form>
    </div>
  )
}