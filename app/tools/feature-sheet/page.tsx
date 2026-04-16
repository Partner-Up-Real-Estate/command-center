'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { buildScenarioTable, fmtMoney, fmtPct } from '@/lib/mortgage'

/* ─── Types ─────────────────────────────────────────────────────────────────── */

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
  name: string; title: string; phone: string; email: string; brokerage: string; license: string; photoUrl: string
}

interface RealtorInfo {
  name: string; title: string; phone: string; email: string; brokerage: string; photoUrl: string
}

interface BrandSettings {
  primaryColor: string; secondaryColor: string; logoUrl: string; logoPlacement: 'header' | 'footer' | 'both'
}

interface Disclaimers {
  tableDisclaimer: string; tableDisclaimerEnabled: boolean; footerDisclaimer: string; footerDisclaimerEnabled: boolean
}

interface SectionToggles {
  gallery: boolean; paymentTable: boolean; brokerCard: boolean; agentCard: boolean
}

const DEFAULT_BROKER: BrokerInfo = {
  name: 'Jarrett White', title: 'Mortgage Broker', phone: '', email: 'jarrett@whiteridge.ca', brokerage: 'Whiteridge Mortgage', license: '', photoUrl: '',
}
const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '#378ADD', secondaryColor: '#534AB7', logoUrl: '', logoPlacement: 'header',
}
const DEFAULT_DISCLAIMERS: Disclaimers = {
  tableDisclaimer: 'Rates subject to qualification and change. CMHC premium includes 0.20% surcharge for 30-year amortization. This is not a commitment to lend.',
  tableDisclaimerEnabled: true,
  footerDisclaimer: 'This is for illustrative purposes only and is not a commitment to lend. Contact your mortgage broker for personalized pre-qualification.',
  footerDisclaimerEnabled: true,
}
const DEFAULT_SECTIONS: SectionToggles = { gallery: true, paymentTable: true, brokerCard: true, agentCard: true }

const LS_BROKER = 'fs:broker'
const LS_BRAND = 'fs:brand'

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function FeatureSheetPage() {
  // Steps
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Listing
  const [listing, setListing] = useState<ScrapedListing | null>(null)
  const [heroPhoto, setHeroPhoto] = useState('')
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([])

  // Settings
  const [ratePct, setRatePct] = useState('4.79')
  const [broker, setBroker] = useState<BrokerInfo>(DEFAULT_BROKER)
  const [realtor, setRealtor] = useState<RealtorInfo>({ name: '', title: 'Realtor', phone: '', email: '', brokerage: '', photoUrl: '' })
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND)
  const [disclaimers, setDisclaimers] = useState<Disclaimers>(DEFAULT_DISCLAIMERS)
  const [sections, setSections] = useState<SectionToggles>(DEFAULT_SECTIONS)
  const [activeTab, setActiveTab] = useState<'listing' | 'photos' | 'brand' | 'people' | 'settings'>('listing')

  // Persist broker + brand
  useEffect(() => { try { const s = localStorage.getItem(LS_BROKER); if (s) setBroker({ ...DEFAULT_BROKER, ...JSON.parse(s) }) } catch {} }, [])
  useEffect(() => { try { localStorage.setItem(LS_BROKER, JSON.stringify(broker)) } catch {} }, [broker])
  useEffect(() => { try { const s = localStorage.getItem(LS_BRAND); if (s) setBrand({ ...DEFAULT_BRAND, ...JSON.parse(s) }) } catch {} }, [])
  useEffect(() => { try { localStorage.setItem(LS_BRAND, JSON.stringify(brand)) } catch {} }, [brand])

  const rate = useMemo(() => { const n = parseFloat(ratePct); return Number.isFinite(n) ? n / 100 : 0 }, [ratePct])
  const scenarios = useMemo(() => {
    if (!listing?.price || !rate) return []
    return buildScenarioTable(listing.price, rate).filter(s => !s.belowMinimum)
  }, [listing?.price, rate])

  /* ─── Actions ─────────────────────────────────────────────────────────────── */

  const handleScrape = async () => {
    if (!url.trim()) return
    setScraping(true); setError(null)
    try {
      const res = await fetch('/api/tools/scrape-listing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scrape failed')
      const l: ScrapedListing = data.listing
      setListing(l)
      if (l.photos[0]) setHeroPhoto(l.photos[0])
      setGalleryPhotos(l.photos.slice(1, 6))
    } catch (e) { setError(e instanceof Error ? e.message : 'Scrape failed') }
    finally { setScraping(false) }
  }

  const startBlank = () => { setListing({ source: 'manual', url: '', price: 0, address: '', photos: [] }) }

  const updateListing = (patch: Partial<ScrapedListing>) => { setListing(prev => prev ? { ...prev, ...patch } : prev) }

  const toggleGalleryPhoto = (photo: string) => {
    setGalleryPhotos(prev => prev.includes(photo) ? prev.filter(p => p !== photo) : prev.length >= 5 ? [...prev.slice(1), photo] : [...prev, photo])
  }

  const addManualPhoto = () => {
    const p = prompt('Paste photo URL')
    if (!p || !listing) return
    setListing({ ...listing, photos: [...listing.photos, p] })
    if (!heroPhoto) setHeroPhoto(p)
  }

  const handleGenerate = async () => {
    if (!listing?.price || !listing?.address) { setError('Price and address are required'); return }
    setGenerating(true); setError(null)
    try {
      const payload = {
        listing: { ...listing, heroPhoto: heroPhoto || undefined, galleryPhotos },
        rate, brand, broker, realtor, disclaimers, sections,
      }
      const res = await fetch('/api/tools/feature-sheet/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const d = await res.json().catch(() => ({ error: 'PDF failed' })); throw new Error(d.error) }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `feature-sheet-${(listing.address || 'listing').replace(/[^a-z0-9]+/gi, '-').slice(0, 48)}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
    } catch (e) { setError(e instanceof Error ? e.message : 'PDF failed') }
    finally { setGenerating(false) }
  }

  /* ─── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">← Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">Feature Sheet Generator</h1>
            <p className="text-xs text-slate-400 mt-0.5">Paste a listing URL or build manually → generate a branded PDF</p>
          </div>
          {listing && (
            <button onClick={handleGenerate} disabled={generating || !listing.price || !listing.address}
              className="px-6 py-2.5 bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-[#30363D] disabled:text-slate-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
              {generating ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>) : '📄 Generate PDF'}
            </button>
          )}
        </div>

        {/* URL Input (if no listing yet) */}
        {!listing && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 max-w-2xl">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Listing URL</label>
            <div className="flex gap-2">
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://www.rew.ca/properties/..." onKeyDown={e => e.key === 'Enter' && handleScrape()}
                className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-[#378ADD]" />
              <button onClick={handleScrape} disabled={scraping || !url.trim()}
                className="px-5 py-2.5 bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-[#30363D] disabled:text-slate-500 text-white text-sm font-bold rounded-lg transition-colors">
                {scraping ? '⏳ Fetching...' : 'Scrape'}
              </button>
            </div>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-200">
                💡 If scrape fails, <button onClick={startBlank} className="underline hover:text-white">start blank</button> and fill details manually.
              </p>
            </div>
            {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"><p className="text-xs text-red-300">{error}</p>
              <button onClick={startBlank} className="text-xs text-red-300 hover:text-red-100 underline mt-2">Start blank instead</button></div>}
          </div>
        )}

        {/* Editor */}
        {listing && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Tabbed editor */}
            <div className="flex-1 min-w-0">
              {/* Tab bar */}
              <div className="flex gap-1 mb-4 bg-[#161B22] rounded-lg p-1 border border-[#30363D]">
                {([['listing', '📋 Listing'], ['photos', '🖼 Photos'], ['brand', '🎨 Brand'], ['people', '👤 People'], ['settings', '⚙ Settings']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${activeTab === key ? 'bg-[#378ADD] text-white' : 'text-slate-400 hover:text-white hover:bg-[#0D1117]'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Listing */}
              {activeTab === 'listing' && (
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold">Listing Details</h2>
                    <button onClick={() => { setListing(null); setHeroPhoto(''); setGalleryPhotos([]); setUrl('') }} className="text-xs text-slate-500 hover:text-red-400">Reset</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price (CAD)" type="number" value={listing.price ?? ''} onChange={v => updateListing({ price: parseFloat(v) || 0 })} />
                    <Field label="MLS #" value={listing.mlsNumber ?? ''} onChange={v => updateListing({ mlsNumber: v })} />
                    <div className="col-span-2"><Field label="Address" value={listing.address ?? ''} onChange={v => updateListing({ address: v })} /></div>
                    <Field label="City" value={listing.city ?? ''} onChange={v => updateListing({ city: v })} />
                    <Field label="Province" value={listing.province ?? ''} onChange={v => updateListing({ province: v })} />
                    <Field label="Beds" type="number" value={listing.beds ?? ''} onChange={v => updateListing({ beds: parseFloat(v) || undefined })} />
                    <Field label="Baths" type="number" value={listing.baths ?? ''} onChange={v => updateListing({ baths: parseFloat(v) || undefined })} />
                    <Field label="Sqft" type="number" value={listing.sqft ?? ''} onChange={v => updateListing({ sqft: parseFloat(v) || undefined })} />
                    <Field label="Property Type" value={listing.propertyType ?? ''} onChange={v => updateListing({ propertyType: v })} />
                  </div>
                </div>
              )}

              {/* Tab: Photos */}
              {activeTab === 'photos' && (
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold">Photo Selection</h2>
                    <button onClick={addManualPhoto} className="text-xs text-[#378ADD] hover:text-[#5aa5f0]">+ Add URL</button>
                  </div>
                  <p className="text-[10px] text-slate-500">Click = set as hero · Shift+click = add/remove from gallery strip</p>
                  {listing.photos.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No photos found. Add URLs manually.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {listing.photos.map((p, i) => {
                        const isHero = p === heroPhoto
                        const inGallery = galleryPhotos.includes(p)
                        return (
                          <button key={i} onClick={e => { if (e.shiftKey) toggleGalleryPhoto(p); else setHeroPhoto(p) }}
                            className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${isHero ? 'border-[#378ADD] ring-2 ring-[#378ADD]/40' : inGallery ? 'border-green-500 ring-1 ring-green-500/30' : 'border-[#30363D] hover:border-slate-500'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p} alt="" className="w-full h-full object-cover" />
                            {isHero && <span className="absolute top-1 left-1 bg-[#378ADD] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">HERO</span>}
                            {inGallery && <span className="absolute top-1 right-1 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{galleryPhotos.indexOf(p) + 1}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-2 border-t border-[#30363D]">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-[#378ADD]" /> <span className="text-[10px] text-slate-400">Hero image</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-green-600" /> <span className="text-[10px] text-slate-400">Gallery strip (max 5)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Brand */}
              {activeTab === 'brand' && (
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-bold">Brand Settings</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-[#30363D] bg-transparent cursor-pointer" />
                        <input type="text" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                          className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#378ADD]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Secondary Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={brand.secondaryColor} onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-[#30363D] bg-transparent cursor-pointer" />
                        <input type="text" value={brand.secondaryColor} onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })}
                          className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#378ADD]" />
                      </div>
                    </div>
                    <div className="col-span-2"><Field label="Logo URL (PNG or SVG)" value={brand.logoUrl} onChange={v => setBrand({ ...brand, logoUrl: v })} /></div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Logo Placement</label>
                      <div className="flex gap-2">
                        {(['header', 'footer', 'both'] as const).map(opt => (
                          <button key={opt} onClick={() => setBrand({ ...brand, logoPlacement: opt })}
                            className={`flex-1 text-xs py-2 rounded-lg transition-colors ${brand.logoPlacement === opt ? 'bg-[#378ADD] text-white font-bold' : 'bg-[#0D1117] text-slate-400 border border-[#30363D]'}`}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">Brand settings are saved locally for reuse.</p>
                </div>
              )}

              {/* Tab: People */}
              {activeTab === 'people' && (
                <div className="space-y-4">
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold">Your Info (Mortgage Broker)</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name" value={broker.name} onChange={v => setBroker({ ...broker, name: v })} />
                      <Field label="Title" value={broker.title} onChange={v => setBroker({ ...broker, title: v })} />
                      <Field label="Phone" value={broker.phone} onChange={v => setBroker({ ...broker, phone: v })} />
                      <Field label="Email" value={broker.email} onChange={v => setBroker({ ...broker, email: v })} />
                      <Field label="Brokerage" value={broker.brokerage} onChange={v => setBroker({ ...broker, brokerage: v })} />
                      <Field label="License #" value={broker.license} onChange={v => setBroker({ ...broker, license: v })} />
                      <div className="col-span-2"><Field label="Headshot URL" value={broker.photoUrl} onChange={v => setBroker({ ...broker, photoUrl: v })} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500">Auto-saved locally for next time.</p>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold">Listing Agent (Realtor)</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name" value={realtor.name} onChange={v => setRealtor({ ...realtor, name: v })} />
                      <Field label="Phone" value={realtor.phone} onChange={v => setRealtor({ ...realtor, phone: v })} />
                      <Field label="Email" value={realtor.email} onChange={v => setRealtor({ ...realtor, email: v })} />
                      <Field label="Brokerage" value={realtor.brokerage} onChange={v => setRealtor({ ...realtor, brokerage: v })} />
                      <div className="col-span-2"><Field label="Headshot URL" value={realtor.photoUrl} onChange={v => setRealtor({ ...realtor, photoUrl: v })} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Settings */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Section Toggles */}
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold">Section Toggles</h2>
                    <p className="text-[10px] text-slate-500 mb-2">Toggle sections on/off in the PDF output.</p>
                    {([['gallery', 'Image Gallery'], ['paymentTable', 'Payment Table'], ['brokerCard', 'Broker Card'], ['agentCard', 'Agent Card']] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between py-2 border-b border-[#0D1117] last:border-0">
                        <span className="text-sm text-slate-300">{label}</span>
                        <button onClick={() => setSections(s => ({ ...s, [key]: !s[key] }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${sections[key] ? 'bg-[#378ADD]' : 'bg-[#30363D]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${sections[key] ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </label>
                    ))}
                  </div>

                  {/* Rate */}
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold">Interest Rate</h2>
                    <div className="flex items-center gap-3">
                      <input type="number" step="0.01" value={ratePct} onChange={e => setRatePct(e.target.value)}
                        className="w-28 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#378ADD]" />
                      <span className="text-sm text-slate-400">% annual</span>
                    </div>
                  </div>

                  {/* Disclaimers */}
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
                    <h2 className="text-sm font-bold">Disclaimers</h2>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-slate-300 font-semibold">Table Disclaimer</label>
                        <button onClick={() => setDisclaimers(d => ({ ...d, tableDisclaimerEnabled: !d.tableDisclaimerEnabled }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${disclaimers.tableDisclaimerEnabled ? 'bg-[#378ADD]' : 'bg-[#30363D]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${disclaimers.tableDisclaimerEnabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <textarea value={disclaimers.tableDisclaimer} onChange={e => setDisclaimers(d => ({ ...d, tableDisclaimer: e.target.value }))}
                        rows={2} className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#378ADD] resize-none" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-slate-300 font-semibold">Footer Disclaimer</label>
                        <button onClick={() => setDisclaimers(d => ({ ...d, footerDisclaimerEnabled: !d.footerDisclaimerEnabled }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${disclaimers.footerDisclaimerEnabled ? 'bg-[#378ADD]' : 'bg-[#30363D]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${disclaimers.footerDisclaimerEnabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <textarea value={disclaimers.footerDisclaimer} onChange={e => setDisclaimers(d => ({ ...d, footerDisclaimer: e.target.value }))}
                        rows={2} className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#378ADD] resize-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Preview */}
            <div className="lg:w-[340px] flex-shrink-0">
              <div className="sticky top-6 space-y-4">
                {/* Mini Preview Card */}
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#30363D] flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300">Preview</h3>
                    <span className="text-[10px] text-slate-500">Live</span>
                  </div>

                  {/* Hero preview */}
                  <div className="relative aspect-[16/10] bg-[#0D1117]">
                    {heroPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No hero image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <p className="text-lg font-bold text-white">{listing.price ? fmtMoney(listing.price) : '$0'}</p>
                      <p className="text-[10px] text-white/80 mt-0.5">{listing.address || 'Address'}</p>
                      <p className="text-[9px] text-white/60 mt-0.5">
                        {[listing.beds && `${listing.beds} bed`, listing.baths && `${listing.baths} bath`, listing.sqft && `${listing.sqft} sqft`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: brand.primaryColor }} />
                  </div>

                  {/* Gallery strip preview */}
                  {sections.gallery && galleryPhotos.length > 0 && (
                    <div className="flex gap-1 p-2">
                      {galleryPhotos.slice(0, 5).map((p, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={p} alt="" className="flex-1 aspect-[4/3] object-cover rounded" />
                      ))}
                    </div>
                  )}

                  {/* Table preview */}
                  {sections.paymentTable && scenarios.length > 0 && (
                    <div className="px-3 py-2">
                      <p className="text-[9px] font-bold text-slate-400 mb-1">Payment Scenarios</p>
                      <table className="w-full text-[8px]">
                        <thead><tr className="text-slate-500">
                          <th className="text-left py-1">Down</th><th className="text-right py-1">Mortgage</th><th className="text-right py-1" style={{ color: brand.primaryColor }}>Payment</th>
                        </tr></thead>
                        <tbody>{scenarios.slice(0, 3).map(s => (
                          <tr key={s.downPct} className="border-t border-[#0D1117]">
                            <td className="py-1">{fmtPct(s.downPct, 0)}</td>
                            <td className="text-right py-1">{fmtMoney(s.totalLoan)}</td>
                            <td className="text-right py-1 font-bold" style={{ color: brand.primaryColor }}>{fmtMoney(s.monthlyPayment, 0)}/mo</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      {scenarios.length > 3 && <p className="text-[8px] text-slate-600 mt-1">+{scenarios.length - 3} more in PDF</p>}
                    </div>
                  )}

                  {/* People preview */}
                  {(sections.brokerCard || sections.agentCard) && (
                    <div className="px-3 py-2 border-t border-[#0D1117] flex gap-2">
                      {sections.brokerCard && (
                        <div className="flex-1 bg-[#0D1117] rounded-lg p-2">
                          <p className="text-[8px] font-bold" style={{ color: brand.primaryColor }}>BROKER</p>
                          <p className="text-[9px] font-bold text-white mt-0.5">{broker.name || 'Name'}</p>
                          {broker.phone && <p className="text-[8px] text-slate-500">{broker.phone}</p>}
                        </div>
                      )}
                      {sections.agentCard && (
                        <div className="flex-1 bg-[#0D1117] rounded-lg p-2">
                          <p className="text-[8px] font-bold" style={{ color: brand.primaryColor }}>AGENT</p>
                          <p className="text-[9px] font-bold text-white mt-0.5">{realtor.name || 'Name'}</p>
                          {realtor.phone && <p className="text-[8px] text-slate-500">{realtor.phone}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Generate button (sticky) */}
                <button onClick={handleGenerate} disabled={generating || !listing.price || !listing.address}
                  className="w-full py-3 bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-[#30363D] disabled:text-slate-500 text-white text-sm font-bold rounded-xl transition-colors">
                  {generating ? 'Generating PDF…' : '📄 Generate Feature Sheet'}
                </button>
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Shared Field Component ────────────────────────────────────────────────── */

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">{label}</span>
      <input type={type} value={value as string | number} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#378ADD]" />
    </label>
  )
}
