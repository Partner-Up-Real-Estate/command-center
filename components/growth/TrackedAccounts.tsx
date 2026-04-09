'use client'

import { useState } from 'react'
import type { Platform, TrackedAccount } from '@/types/index'

interface TrackedAccountsProps {
  accounts: TrackedAccount[]
  onAdd: (platform: Platform, handle: string) => void
  onRemove: (id: string) => void
  onRefresh: (id: string) => void
  isLoading: boolean
}

const InstagramIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="2" width="20" height="20" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 5 3.64 9.12 8.44 9.88v-7H7.9v-2.3h2.54V9.5c0-2.5 1.5-3.88 3.78-3.88 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.62.77-1.62 1.56v1.88h2.77l-.44 2.3h-2.33v7c4.8-.76 8.44-4.87 8.44-9.88 0-5.52-4.48-10-10-10z" />
  </svg>
)

const LinkedInIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

const TikTokIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.9 2.9 0 0 1 2.31-4.64 2.88 2.88 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.1A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

function getPlatformIcon(platform: Platform) {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon />
    case 'facebook':
      return <FacebookIcon />
    case 'linkedin':
      return <LinkedInIcon />
    case 'tiktok':
      return <TikTokIcon />
    case 'youtube':
      return <YouTubeIcon />
    default:
      return null
  }
}

function getPlatformLabel(platform: Platform) {
  const labels: Record<Platform, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    youtube: 'YouTube',
  }
  return labels[platform]
}

function formatDate(date: Date | undefined): string {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export default function TrackedAccounts({
  accounts,
  onAdd,
  onRemove,
  onRefresh,
  isLoading,
}: TrackedAccountsProps) {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [handle, setHandle] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const handleAdd = () => {
    if (handle.trim()) {
      onAdd(platform, handle.trim())
      setHandle('')
    }
  }

  const handleRemove = (id: string) => {
    onRemove(id)
    setRemoving(null)
  }

  return (
    <div className="space-y-6">
      {/* Add Account Form */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Add Account to Track</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm focus:outline-none focus:border-[#378ADD] transition-colors"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>

          <input
            type="text"
            placeholder="Enter handle (e.g., @username)"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-[#6E7681] text-sm focus:outline-none focus:border-[#378ADD] transition-colors"
          />

          <button
            onClick={handleAdd}
            disabled={isLoading || !handle.trim()}
            className="px-6 py-2.5 bg-[#378ADD] hover:bg-[#2E6BA3] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Track
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
            <p className="text-[#8B949E] text-sm">
              Start tracking accounts in your niche to see what content is performing.
            </p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex items-start justify-between"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 bg-[#0D1117] border border-[#30363D] rounded-lg flex items-center justify-center text-[#378ADD]">
                  {getPlatformIcon(account.platform)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold text-sm">@{account.handle}</h4>
                    <span className="text-xs px-2 py-1 bg-[#0D1117] text-[#8B949E] rounded border border-[#30363D]">
                      {getPlatformLabel(account.platform)}
                    </span>
                  </div>
                  {account.displayName && (
                    <p className="text-[#8B949E] text-xs mb-2">{account.displayName}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[#6E7681]">
                    {account.followerCount !== undefined && (
                      <span>{account.followerCount.toLocaleString()} followers</span>
                    )}
                    <span>Last synced: {formatDate(account.lastFetched)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => onRefresh(account.id)}
                  disabled={isLoading}
                  className="px-3 py-2 bg-[#0D1117] hover:bg-[#1C2333] disabled:bg-gray-700 disabled:cursor-not-allowed text-[#378ADD] text-xs font-medium rounded-lg border border-[#30363D] transition-colors"
                  title="Refresh posts"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setRemoving(account.id)}
                  className="px-3 py-2 bg-[#0D1117] hover:bg-red-600/10 text-red-400 hover:text-red-300 text-xs font-medium rounded-lg border border-[#30363D] hover:border-red-600 transition-colors"
                  title="Remove account"
                >
                  Remove
                </button>
              </div>

              {/* Confirmation Popover */}
              {removing === account.id && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 max-w-sm">
                    <p className="text-white font-semibold mb-4">
                      Remove @{account.handle}?
                    </p>
                    <p className="text-[#8B949E] text-sm mb-6">
                      This will delete all tracked posts from this account.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRemoving(null)}
                        className="flex-1 px-4 py-2 bg-[#0D1117] hover:bg-[#1C2333] text-white text-sm font-medium rounded-lg border border-[#30363D] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRemove(account.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
