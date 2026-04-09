'use client'

import { useState } from 'react'
import type { TrackedPost, Hook } from '@/types/index'

interface HookGeneratorProps {
  topPosts: TrackedPost[]
  onSaveHook: (text: string, label: string) => void
  savedHooks: Hook[]
}

function parseLabel(text: string): string {
  if (text.toLowerCase().includes('mortgage')) return 'mortgage'
  if (text.toLowerCase().includes('broki')) return 'broki'
  return 'personal brand'
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-[#378ADD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

export default function HookGenerator({
  topPosts,
  onSaveHook,
  savedHooks,
}: HookGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [hooks, setHooks] = useState<string[]>([])
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (topPosts.length === 0) {
      setError('Add tracked accounts and refresh posts first.')
      return
    }

    setGenerating(true)
    setError(null)
    setHooks([])
    setSavedIndices(new Set())

    try {
      const response = await fetch('/api/growth/hooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate hooks')
      }

      const data = await response.json()
      setHooks(data.hooks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hooks')
    } finally {
      setGenerating(false)
    }
  }

  const handleUseHook = (hookText: string) => {
    localStorage.setItem('pendingHook', JSON.stringify({ text: hookText, timestamp: Date.now() }))
    // Trigger event for toast notification
    window.dispatchEvent(new CustomEvent('hookUsed', { detail: { hook: hookText } }))
  }

  const handleSaveHook = async (hookText: string, index: number) => {
    setSavingId(index)
    const label = parseLabel(hookText)

    try {
      const response = await fetch('/api/growth/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hookText, label }),
      })

      if (!response.ok) {
        throw new Error('Failed to save hook')
      }

      setSavedIndices((prev) => new Set([...Array.from(prev), index]))
      onSaveHook(hookText, label)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hook')
    } finally {
      setSavingId(null)
    }
  }

  const getBadgeColor = (label: string) => {
    switch (label) {
      case 'mortgage':
        return 'bg-[#378ADD]/20 text-[#378ADD]'
      case 'broki':
        return 'bg-[#534AB7]/20 text-[#534AB7]'
      default:
        return 'bg-[#888780]/20 text-[#888780]'
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full px-6 py-4 bg-[#378ADD] hover:bg-[#2E6BA3] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
        >
          {generating && <Spinner />}
          {generating ? 'Analyzing top-performing content...' : 'Generate Hook Ideas'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-600/10 border border-red-600/50 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Generated Hooks */}
      {hooks.length > 0 && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Generated Hooks</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {hooks.map((hookText, index) => {
              const label = parseLabel(hookText)
              const isSaved = savedIndices.has(index)

              return (
                <div key={index} className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#8B949E] text-sm font-medium">
                          {index + 1}.
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getBadgeColor(label)}`}>
                          {label === 'mortgage' ? 'Mortgage' : label === 'broki' ? 'Broki' : 'Personal Brand'}
                        </span>
                      </div>
                      <p className="text-white text-sm">{hookText}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#30363D]">
                    <button
                      onClick={() => handleUseHook(hookText)}
                      className="px-3 py-2 bg-[#0D1117] hover:bg-[#1C2333] text-[#378ADD] text-xs font-medium rounded border border-[#30363D] transition-colors"
                    >
                      Use This
                    </button>
                    <button
                      onClick={() => handleSaveHook(hookText, index)}
                      disabled={savingId === index || isSaved}
                      className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                        isSaved
                          ? 'bg-green-600/20 border-green-600/50 text-green-400 cursor-default'
                          : 'bg-[#0D1117] hover:bg-[#1C2333] text-[#8B949E] hover:text-white border-[#30363D]'
                      }`}
                    >
                      {savingId === index ? (
                        <span className="flex items-center gap-1">
                          <Spinner />
                          Saving
                        </span>
                      ) : isSaved ? (
                        'Saved!'
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Saved Hooks Section */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Saved Hooks</h3>
        {savedHooks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#8B949E] text-sm">
              Save generated hooks to reference them later
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {savedHooks.map((hook) => (
              <div key={hook.id} className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getBadgeColor(hook.label || 'personal brand')}`}>
                        {hook.label === 'mortgage' ? 'Mortgage' : hook.label === 'broki' ? 'Broki' : 'Personal Brand'}
                      </span>
                      <span className="text-xs text-[#6E7681]">{formatDate(hook.generatedAt)}</span>
                    </div>
                    <p className="text-white text-sm">{hook.text}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleUseHook(hook.text)}
                  className="mt-3 px-3 py-2 bg-[#0D1117] hover:bg-[#1C2333] text-[#378ADD] text-xs font-medium rounded border border-[#30363D] transition-colors"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
