'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { buildScenarioTable, fmtMoney, fmtPct } from '@/lib/mortgage'

interface ScrapedListing {
  source: string
  url: string
  price?: number
  address?: string
  city?: string
  province?: string
  beds?: number
  baths?: number
  sqft?: number
  propertyType?: string
  mlsNumber?: string
  description?: string
  photos: string[]
}

interface BrokerInfo {
  name: string
  title: string
  phone: string
  email: string
  brokerage: string
  license: string
}

interface RealtorInfo {
  name: string
  title: string
  phone: string
  email: string
  brokerage: string
}

const DEFAULT_BROKER: BrokerInfo = {
  name: 'Jarrett White',
  title: 'Mortgage Broker',
  phone: '',
  email: 'jarrett@whiteridge.ca',
  brokerage: 'Whiteridge Mortgage',
  license: '',
}

const BROKER_STORAGE_KEY = 'fs:broker'

export default function FeatureSheetPage() {
  // Step state
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable listing
  const [listing, setListing] = useState<ScrapedListing | null>(null)
  const [heroPhoto, setHeroPhoto] = useState<string>('')
  const [stripPhotos, setStripPhotos] = useState<string[]>([])

  // Rate
  const [ratePct, setRatePct] = useState('4.79')

  // Broker (persisted to localStorage)
  const [broker, setBroker] = useState<BrokerInfo>(DEFAULT_BROKER)

  // Realtor
  const [realtor, setRealtor] = useState<RealtorInfo>({
    name: '',
    title: 'Realtor',
    phone: '',
    email: '',
    brokerage: '',
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BROKER_STORAGE_KEY)
      if (stored) setBroker({ ...DEFAULT_BROKER, ...JSON.parse(stored) })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(BROKER_STORAGE_KEY, JSON.stringify(broker))
    } catch {
      /* ignore */
    }
  }, [broker])

  const rate = useMemo(() => {
    const n = parseFloat(ratePct)
    return Number.isFinite(n) ? n / 100 : 0
  }, [ratePct])

  const scenarios = useMemo(() => {
    if (!listing?.price || !rate) return []
    return buildScenarioTable(listing.price, rate).filter(s => !s.belowMinimum)
  }, [listing?.price, rate])

  const handleScrape = async () => {
    if (!url.trim()) return
    setScraping(true)
    setError(null)
    try {
      const res = await fetch('/api/tools/scrape-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scrape failed')
      const l: ScrapedListing = data.listing
      setListing(l)
      if (l.photos[0]) setHeroPhoto(l.photos[0])
      setStripPhotos(l.photos.slice(1, 5))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scrape failed')
    } finally {
      setScraping(false)
    }
  }

  const startBlank = () => {
    setListing({
      source: 'manual',
      url: '',
      price: 0,
      address: '',
      photos: [],
    })
  }

  const updateListing = (patch: Partial<ScrapedListing>) => {
    setListing(prev => (prev ? { ...prev, ...patch } : prev))
  }

  const toggleStripPhoto = (photo: string) => {
    setStripPhotos(prev => {
      if (prev.includes(photo)) return prev.filter(p => p !== photo)
      if (prev.length >= 4) return [...prev.slice(1), photo]
      return [...prev, photo]
    })
  }

  const addManualPhoto = () => {
    const p = prompt('Paste photo URL')
    if (!p || !listing) return
    const photos = [...listing.photos, p]
    setListing({ ...listing, photos })
    if (!heroPhoto) setHeroPhoto(p)
  }

  const handleGenerate = async () => {
    if (!listing?.price || !listing?.address) {
      setError('Price and address are required')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const payload = {
        listing: {
          price: listing.price,
          address: listing.address,
          city: listing.city,
          province: listing.province,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          propertyType: listing.propertyType,
          mlsNumber: listing.mlsNumber,
          description: listing.description,
          heroPhoto: heroPhoto || undefined,
          stripPhotos,
        },
        rate,
        broker,
        realtor,
      }
      const res = await fetch('/api/tools/feature-sheet/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'PDF failed' }))
        throw new Error(data.error || 'PDF failed')
      }
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `feature-sheet-${(listing.address || 'listing').replace(/[^a-z0-9]+/gi, '-').slice(0, 48)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-2">Feature Sheet Generator</h1>
            <p className="text-sm text-slate-400 mt-1">
              Paste a rew.ca or realtor.ca listing, tweak details, generate a branded PDF.
            </p>
          </div>
        </div>

        {/* URL input */}
        {!listing && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Listing URL (rew.ca or realtor.ca)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.rew.ca/properties/..."
                className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-[#378ADD]"
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
              />
              <button
                onClick={handleScrape}
                disabled={scraping || !url.trim()}
                className="px-5 py-2.5 bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-[#30363D] disabled:text-slate-500 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {scraping ? 'Scraping…' : 'Scrape'}
              </button>
            </div>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-200">
                💡 <strong>Pro tip:</strong> Some listing sites block automated scraping. If scrape fails, you can{' '}
                <button onClick={startBlank} className="underline hover:text-white">
                  start blank
                </button>
                {' '}and fill the details manually.
              </p>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-300">{error}</p>
                <button onClick={startBlank} className="text-xs text-red-300 hover:text-red-100 underline mt-2">
                  Start with blank form instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        {listing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: listing + photos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Listing fields */}
              <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">Listing Details</h2>
                  <button
                    onClick={() => {
                      setListing(null)
                      setHeroPhoto('')
                      setStripPhotos([])
                      setUrl('')
                    }}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price (CAD)" type="number" value={listing.price ?? ''}
                    onChange={v => updateListing({ price: parseFloat(v) || 0 })} />
                  <Field label="MLS #" value={listing.mlsNumber ?? ''}
                    onChange={v => updateListing({ mlsNumber: v })} />
                  <div className="col-span-2">
                    <Field label="Address" value={listing.address ?? ''}
                      onChange={v => updateListing({ address: v })} />
                  </div>
                  <Field label="City" value={listing.city ?? ''}
                    onChange={v => updateListing({ city: v })} />
                  <Field label="Province" value={listing.province ?? ''}
                    onChange={v => updateListing({ province: v })} />
                  <Field label="Beds" type="number" value={listing.beds ?? ''}
                    onChange={v => updateListing({ beds: parseFloat(v) || undefined })} />
                  <Field label="Baths" type="number" value={listing.baths ?? ''}
                    onChange={v => updateListing({ baths: parseFloat(v) || undefined })} />
                  <Field label="Sqft" type="number" value={listing.sqft ?? ''}
                    onChange={v => updateListing({ sqft: parseFloat(v) || undefined })} />
                  <Field label="Property Type" value={listing.propertyType ?? ''}
                    onChange={v => updateListing({ propertyType: v })} />
                </div>
              </section>

              {/* Photos */}
              <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">
                    Photos <span className="text-slate-500 font-normal text-xs">— click to set hero, shift-click for strip</span>
                  </h2>
                  <button
                    onClick={addManualPhoto}
                    className="text-xs text-[#378ADD] hover:text-[#5aa5f0]"
                  >
                    + Add URL
                  </button>
                </div>
                {listing.photos.length === 0 ? (
                  <p className="text-xs text-slate-500">No photos found. Add URLs manually.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.photos.map((p, i) => {
                      const isHero = p === heroPhoto
                      const inStrip = stripPhotos.includes(p)
                      return (
                        <button
                          key={i}
                          onClick={e => {
                            if (e.shiftKey) toggleStripPhoto(p)
                            else setHeroPhoto(p)
                          }}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                            isHero ? 'border-[#378ADD] ring-2 ring-[#378ADD]/40' : inStrip ? 'border-amber-500' : 'border-[#30363D] hover:border-slate-500'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p} alt="" className="w-full h-full object-cover" />
                          {isHero && (
                            <span className="absolute top-1 left-1 bg-[#378ADD] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              HERO
                            </span>
                          )}
                          {inStrip && (
                            <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              STRIP {stripPhotos.indexOf(p) + 1}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Scenario preview */}
              <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">Payment Scenarios (preview)</h2>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Rate %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ratePct}
                      onChange={e => setRatePct(e.target.value)}
                      className="w-20 bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-[#378ADD]"
                    />
                  </div>
                </div>
                {scenarios.length === 0 ? (
                  <p className="text-xs text-slate-500">Enter a price to see scenarios.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-[#30363D]">
                          <th className="text-left py-2 pr-3 font-semibold">Down %</th>
                          <th className="text-right py-2 pr-3 font-semibold">Down $</th>
                          <th className="text-right py-2 pr-3 font-semibold">Base Loan</th>
                          <th className="text-right py-2 pr-3 font-semibold">CMHC</th>
                          <th className="text-right py-2 pr-3 font-semibold">Total Loan</th>
                          <th className="text-right py-2 pr-3 font-semibold text-[#378ADD]">Monthly</th>
                          <th className="text-right py-2 font-semibold">Bi-weekly</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenarios.map(s => (
                          <tr key={s.downPct} className="border-b border-[#161B22]">
                            <td className="py-2 pr-3 font-semibold">{fmtPct(s.downPct, 0)}</td>
                            <td className="py-2 pr-3 text-right">{fmtMoney(s.downAmount)}</td>
                            <td className="py-2 pr-3 text-right">{fmtMoney(s.baseLoan)}</td>
                            <td className="py-2 pr-3 text-right text-slate-400">
                              {s.insured ? fmtMoney(s.cmhcPremiumAmount) : '—'}
                            </td>
                            <td className="py-2 pr-3 text-right">{fmtMoney(s.totalLoan)}</td>
                            <td className="py-2 pr-3 text-right font-bold text-[#378ADD]">
                              {fmtMoney(s.monthlyPayment, 2)}
                            </td>
                            <td className="py-2 text-right">{fmtMoney(s.biweeklyPayment, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* Right: broker + realtor + generate */}
            <div className="space-y-6">
              <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <h2 className="text-sm font-bold mb-4">Your Info (Broker)</h2>
                <div className="space-y-3">
                  <Field label="Name" value={broker.name} onChange={v => setBroker({ ...broker, name: v })} />
                  <Field label="Title" value={broker.title} onChange={v => setBroker({ ...broker, title: v })} />
                  <Field label="Phone" value={broker.phone} onChange={v => setBroker({ ...broker, phone: v })} />
                  <Field label="Email" value={broker.email} onChange={v => setBroker({ ...broker, email: v })} />
                  <Field label="Brokerage" value={broker.brokerage} onChange={v => setBroker({ ...broker, brokerage: v })} />
                  <Field label="License #" value={broker.license} onChange={v => setBroker({ ...broker, license: v })} />
                </div>
                <p className="text-[10px] text-slate-500 mt-3">Saved locally for next time.</p>
              </section>

              <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <h2 className="text-sm font-bold mb-4">Listing Agent (Realtor)</h2>
                <div className="space-y-3">
                  <Field label="Name" value={realtor.name} onChange={v => setRealtor({ ...realtor, name: v })} />
                  <Field label="Phone" value={realtor.phone} onChange={v => setRealtor({ ...realtor, phone: v })} />
                  <Field label="Email" value={realtor.email} onChange={v => setRealtor({ ...realtor, email: v })} />
                  <Field label="Brokerage" value={realtor.brokerage} onChange={v => setRealtor({ ...realtor, brokerage: v })} />
                </div>
              </section>

              <button
                onClick={handleGenerate}
                disabled={generating || !listing.price || !listing.address}
                className="w-full py-3 bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-[#30363D] disabled:text-slate-500 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {generating ? 'Generating PDF…' : 'Generate Feature Sheet PDF'}
              </button>
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value as string | number}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#378ADD]"
      />
    </label>
  )
}
