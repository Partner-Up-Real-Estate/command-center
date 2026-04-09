'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import { DAILY_BLOCKS } from '@/lib/blocks'
import { getDayKey } from '@/lib/storage'
import { getBranding, saveBranding, type BrandingConfig } from '@/lib/branding'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState<'today' | 'all' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Branding state
  const [branding, setBranding] = useState<BrandingConfig>({
    platformName: 'Whiteridge',
    subtitle: 'Command Center',
    logoUrl: null,
    accentColor: '#378ADD',
  })
  const [brandingSaved, setBrandingSaved] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    setBranding(getBranding())
  }, [])

  const handleBrandingSave = () => {
    saveBranding(branding)
    setBrandingSaved(true)
    // Notify sidebar to update
    window.dispatchEvent(new Event('branding-updated'))
    setTimeout(() => setBrandingSaved(false), 2000)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) {
      alert('Logo must be under 500KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setBranding(prev => ({ ...prev, logoUrl: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setBranding(prev => ({ ...prev, logoUrl: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClearToday = async () => {
    setIsDeleting(true)
    try {
      const today = new Date()
      const dayKey = getDayKey(today)
      localStorage.removeItem(`day-state:${dayKey}`)
      setConfirmDelete(null)
    } catch (error) {
      console.error('Error clearing today state:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClearAll = async () => {
    setIsDeleting(true)
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('day-state:'))
      keys.forEach((key) => localStorage.removeItem(key))
      setConfirmDelete(null)
    } catch (error) {
      console.error('Error clearing all states:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D1117]">
        <div className="text-[#378ADD]">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <PageShell pageContext="settings">
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-[#8B949E]">Manage your account, branding, and Daily OS configuration</p>
            </div>

            {/* Branding / Customization Section */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white">Branding</h2>
              <p className="text-[#8B949E] text-sm -mt-2">Customize how your Command Center looks</p>

              {/* Platform Name */}
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] mb-2">Platform Name</label>
                <input
                  type="text"
                  value={branding.platformName}
                  onChange={(e) => setBranding(prev => ({ ...prev, platformName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm outline-none focus:border-[#378ADD] transition-colors"
                  placeholder="e.g. Whiteridge, Broki, My Dashboard"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] mb-2">Subtitle</label>
                <input
                  type="text"
                  value={branding.subtitle}
                  onChange={(e) => setBranding(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm outline-none focus:border-[#378ADD] transition-colors"
                  placeholder="e.g. Command Center, Daily OS, HQ"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {branding.logoUrl ? (
                      <img
                        src={branding.logoUrl}
                        alt="Logo preview"
                        className="w-14 h-14 rounded-lg object-cover border border-[#30363D]"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-white text-xl font-bold border border-[#30363D]"
                        style={{ backgroundColor: branding.accentColor }}
                      >
                        {branding.platformName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-[#0D1117] hover:bg-[#1C2333] text-white text-sm font-medium rounded-lg border border-[#30363D] transition-colors"
                    >
                      Upload Logo
                    </button>
                    {branding.logoUrl && (
                      <button
                        onClick={handleRemoveLogo}
                        className="ml-2 px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[#6E7681] text-xs">PNG, JPG, SVG, or WebP. Max 500KB.</p>
                  </div>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] mb-2">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded border border-[#30363D] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.accentColor}
                    onChange={(e) => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm font-mono w-28 outline-none focus:border-[#378ADD]"
                  />
                  {/* Preset colors */}
                  <div className="flex gap-1.5 ml-2">
                    {['#378ADD', '#534AB7', '#3B6D11', '#BA7517', '#A32D2D', '#888780'].map(color => (
                      <button
                        key={color}
                        onClick={() => setBranding(prev => ({ ...prev, accentColor: color }))}
                        className="w-6 h-6 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: color,
                          borderColor: branding.accentColor === color ? '#fff' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleBrandingSave}
                  className="px-6 py-2.5 bg-[#378ADD] hover:bg-[#2d6ab5] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save Branding
                </button>
                {brandingSaved && (
                  <span className="text-green-400 text-sm font-medium animate-in fade-in">Saved!</span>
                )}
              </div>
            </div>

            {/* Profile Section */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Profile</h2>

              <div className="flex items-start gap-4">
                {session?.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8B949E] mb-2">Name</label>
                    <div className="px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm">
                      {session?.user?.name || 'Unknown'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8B949E] mb-2">Email</label>
                    <div className="px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm">
                      {session?.user?.email || 'Unknown'}
                    </div>
                  </div>

                  <div className="text-xs text-[#6E7681]">Powered by Google Account</div>
                </div>
              </div>
            </div>

            {/* Calendar Section */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Calendar Integration</h2>

              <div className="space-y-4">
                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-sm mb-1">Google Calendar</h3>
                    <p className="text-[#8B949E] text-xs">Connected and syncing events</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-400 text-xs font-medium">Connected</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8B949E] mb-2">Calendar ID</label>
                  <div className="px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm font-mono">
                    jarrett@whiteridge.ca
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8B949E] mb-2">Timezone</label>
                  <div className="px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm">
                    Pacific/Honolulu (Hawaii)
                  </div>
                </div>
              </div>
            </div>

            {/* Daily OS Template Section */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Daily OS Template</h2>
              <p className="text-[#8B949E] text-sm">Your 12-block daily schedule with all tasks</p>

              <div className="space-y-3">
                {DAILY_BLOCKS.map((block) => (
                  <div key={block.id} className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-sm">{block.title}</h3>
                        <p className="text-[#8B949E] text-xs mt-1">
                          {block.startTime} – {block.endTime}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: block.color + '40', color: block.color }}
                        >
                          {block.category}
                        </span>
                      </div>
                    </div>
                    <ul className="text-[#6E7681] text-xs space-y-1 mt-2">
                      {block.tasks.map((task, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[#30363D]">&#8226;</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Section */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Data Management</h2>

              <div className="space-y-3">
                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium text-sm mb-1">Clear today's data</h3>
                    <p className="text-[#6E7681] text-xs">Reset all checklists, KPIs, and scorecard for today</p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete('today')}
                    className="px-4 py-2 bg-[#378ADD] hover:bg-[#2E6FBC] text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0 ml-4"
                  >
                    Clear
                  </button>
                </div>

                {confirmDelete === 'today' && (
                  <div className="bg-[#378ADD]/10 border border-[#378ADD]/50 rounded-lg p-4 space-y-3">
                    <p className="text-[#378ADD] font-medium text-sm">Clear today's data?</p>
                    <p className="text-[#8B949E] text-xs">This action cannot be undone. All progress for today will be lost.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 bg-[#0D1117] hover:bg-[#1C2333] text-white text-sm font-medium rounded border border-[#30363D] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearToday}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-[#378ADD] hover:bg-[#2E6FBC] disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                      >
                        {isDeleting ? 'Clearing...' : 'Clear Today'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[#0D1117] border border-red-600/40 rounded-lg p-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-red-400 font-medium text-sm mb-1">Clear all day states</h3>
                    <p className="text-[#6E7681] text-xs">Permanently delete all historical data (all days)</p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete('all')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0 ml-4"
                  >
                    Delete All
                  </button>
                </div>

                {confirmDelete === 'all' && (
                  <div className="bg-red-600/10 border border-red-600/50 rounded-lg p-4 space-y-3">
                    <p className="text-red-400 font-medium text-sm">Delete all day states?</p>
                    <p className="text-red-300/70 text-xs">This action cannot be undone. You will lose all historical data.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 bg-[#0D1117] hover:bg-[#1C2333] text-white text-sm font-medium rounded border border-[#30363D] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearAll}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, delete all'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
    </PageShell>
  )
}
