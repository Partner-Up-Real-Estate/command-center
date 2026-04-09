'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import {
  getContentDay,
  saveContentDay,
  getFeedback,
  type ContentDay,
  type ContentTopic,
} from '@/lib/content-engine'

const BRAND_COLORS = {
  whiteridge: { bg: 'bg-[#378ADD]/10', border: 'border-[#378ADD]/30', text: 'text-[#378ADD]', badge: 'bg-[#378ADD]' },
  broki: { bg: 'bg-[#534AB7]/10', border: 'border-[#534AB7]/30', text: 'text-[#534AB7]', badge: 'bg-[#534AB7]' },
}

export default function ContentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Pacific/Honolulu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  })
  const [contentDay, setContentDay] = useState<ContentDay | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'whiteridge' | 'broki'>('whiteridge')
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    const existing = getContentDay(selectedDate)
    setContentDay(existing)
  }, [selectedDate])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const feedback = getFeedback()
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, feedback }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()

      const day: ContentDay = {
        date: selectedDate,
        generatedAt: new Date().toISOString(),
        topics: data.topics.map((t: any, idx: number) => ({
          id: `${selectedDate}-${idx}`,
          brand: t.brand,
          topic: t.topic,
          angle: t.angle,
          selected: false,
          hooks: t.hooks.map((h: string) => ({
            text: h,
            selected: false,
            performance: 'none' as const,
          })),
          generatedAt: new Date().toISOString(),
        })),
      }

      saveContentDay(day)
      setContentDay(day)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleTopicSelected = (topicId: string) => {
    if (!contentDay) return
    const updated = {
      ...contentDay,
      topics: contentDay.topics.map(t =>
        t.id === topicId ? { ...t, selected: !t.selected } : t
      ),
    }
    saveContentDay(updated)
    setContentDay(updated)
  }

  const toggleHookSelected = (topicId: string, hookIdx: number) => {
    if (!contentDay) return
    const updated = {
      ...contentDay,
      topics: contentDay.topics.map(t =>
        t.id === topicId
          ? {
              ...t,
              hooks: t.hooks.map((h, i) =>
                i === hookIdx ? { ...h, selected: !h.selected } : h
              ),
            }
          : t
      ),
    }
    saveContentDay(updated)
    setContentDay(updated)
  }

  const setHookPerformance = (topicId: string, hookIdx: number, perf: 'good' | 'poor' | 'none') => {
    if (!contentDay) return
    const updated = {
      ...contentDay,
      topics: contentDay.topics.map(t =>
        t.id === topicId
          ? {
              ...t,
              hooks: t.hooks.map((h, i) =>
                i === hookIdx ? { ...h, performance: perf } : h
              ),
            }
          : t
      ),
    }
    saveContentDay(updated)
    setContentDay(updated)
  }

  const filteredTopics = contentDay?.topics.filter(t => t.brand === activeTab) || []
  const feedback = getFeedback()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D1117]">
        <div className="text-[#378ADD]">Loading...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <PageShell pageContext="content">
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Content Engine</h1>
                <p className="text-[#8B949E]">
                  AI-generated topics and hooks that improve from your feedback
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm outline-none focus:border-[#378ADD]"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-5 py-2.5 bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      {contentDay ? 'Regenerate' : 'Generate Today'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Feedback Stats */}
            {(feedback.topicsSelected > 0 || feedback.goodPerformance > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{feedback.topicsSelected}</div>
                  <div className="text-xs text-[#8B949E]">Topics Selected</div>
                </div>
                <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{feedback.hooksSelected}</div>
                  <div className="text-xs text-[#8B949E]">Hooks Used</div>
                </div>
                <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-400">{feedback.goodPerformance}</div>
                  <div className="text-xs text-[#8B949E]">Good Performance</div>
                </div>
                <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-400">{feedback.poorPerformance}</div>
                  <div className="text-xs text-[#8B949E]">Poor Performance</div>
                </div>
              </div>
            )}

            {/* Brand Tabs */}
            <div className="flex gap-2 border-b border-[#30363D] pb-0">
              <button
                onClick={() => setActiveTab('whiteridge')}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'whiteridge'
                    ? 'bg-[#378ADD]/15 text-[#378ADD] border-b-2 border-[#378ADD]'
                    : 'text-[#8B949E] hover:text-white'
                }`}
              >
                Whiteridge Mortgage
              </button>
              <button
                onClick={() => setActiveTab('broki')}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'broki'
                    ? 'bg-[#534AB7]/15 text-[#534AB7] border-b-2 border-[#534AB7]'
                    : 'text-[#8B949E] hover:text-white'
                }`}
              >
                Broki Technologies
              </button>
            </div>

            {/* Content Topics */}
            {!contentDay ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg className="w-16 h-16 text-[#30363D] mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z" />
                </svg>
                <h3 className="text-white text-lg font-semibold mb-2">No content generated yet</h3>
                <p className="text-[#8B949E] text-sm mb-4 max-w-md">
                  Click "Generate Today" to get 5 topics for Whiteridge Mortgage and 5 for Broki Technologies, each with 5 reel hooks.
                </p>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-12 text-[#8B949E] text-sm">
                No {activeTab === 'whiteridge' ? 'Whiteridge' : 'Broki'} topics for this day.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTopics.map((topic) => {
                  const colors = BRAND_COLORS[topic.brand]
                  const isExpanded = expandedTopic === topic.id
                  const selectedHooks = topic.hooks.filter(h => h.selected).length

                  return (
                    <div
                      key={topic.id}
                      className={`bg-[#161B22] border rounded-xl overflow-hidden transition-all ${
                        topic.selected ? colors.border : 'border-[#30363D]'
                      }`}
                    >
                      {/* Topic Header */}
                      <div className="p-4 flex items-start gap-3">
                        <button
                          onClick={() => toggleTopicSelected(topic.id)}
                          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                            topic.selected
                              ? `${colors.badge} border-transparent text-white`
                              : 'border-[#30363D] hover:border-[#8B949E]'
                          }`}
                        >
                          {topic.selected && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm">{topic.topic}</h3>
                          <p className="text-[#8B949E] text-xs mt-1">{topic.angle}</p>
                          {selectedHooks > 0 && (
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                              {selectedHooks} hook{selectedHooks !== 1 ? 's' : ''} selected
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                          className="text-[#8B949E] hover:text-white transition-colors flex-shrink-0"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                          </svg>
                        </button>
                      </div>

                      {/* Hooks */}
                      {isExpanded && (
                        <div className="border-t border-[#30363D] px-4 py-3 space-y-2">
                          <div className="text-xs font-semibold text-[#8B949E] mb-2">VIDEO HOOKS (Reels / TikTok)</div>
                          {topic.hooks.map((hook, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                hook.selected ? `${colors.bg} ${colors.border}` : 'border-[#30363D] bg-[#0D1117]'
                              }`}
                            >
                              <button
                                onClick={() => toggleHookSelected(topic.id, idx)}
                                className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                                  hook.selected
                                    ? `${colors.badge} border-transparent text-white`
                                    : 'border-[#30363D] hover:border-[#8B949E]'
                                }`}
                              >
                                {hook.selected && (
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm">"{hook.text}"</p>
                              </div>

                              {hook.selected && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => setHookPerformance(topic.id, idx, hook.performance === 'good' ? 'none' : 'good')}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                                      hook.performance === 'good'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'text-[#30363D] hover:text-green-400/50'
                                    }`}
                                    title="Good performance"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setHookPerformance(topic.id, idx, hook.performance === 'poor' ? 'none' : 'poor')}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                                      hook.performance === 'poor'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'text-[#30363D] hover:text-red-400/50'
                                    }`}
                                    title="Poor performance"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Learning Insights */}
            {feedback.topKeywords.length > 0 && (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">AI Learning Insights</h3>
                <p className="text-[#8B949E] text-xs">
                  The content engine adapts based on your selections and performance ratings.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-[#8B949E]">Preferred themes:</span>
                  {feedback.topKeywords.slice(0, 8).map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
                {feedback.avoidKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-[#8B949E]">Avoided themes:</span>
                    {feedback.avoidKeywords.slice(0, 6).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
    </PageShell>
  )
}
