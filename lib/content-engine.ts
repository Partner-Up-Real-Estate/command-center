export interface ContentHook {
  text: string
  selected: boolean
  performance: 'none' | 'good' | 'poor'
}

export interface ContentTopic {
  id: string
  brand: 'broki' | 'whiteridge'
  topic: string
  angle: string
  hooks: ContentHook[]
  selected: boolean
  generatedAt: string // ISO date
}

export interface ContentDay {
  date: string // YYYY-MM-DD
  topics: ContentTopic[]
  generatedAt: string
}

export interface ContentFeedback {
  topicsSelected: number
  topicsIgnored: number
  hooksSelected: number
  hooksIgnored: number
  goodPerformance: number
  poorPerformance: number
  topKeywords: string[] // from selected topics
  avoidKeywords: string[] // from ignored/poor topics
}

const CONTENT_KEY_PREFIX = 'cc_content:'
const FEEDBACK_KEY = 'cc_content_feedback'

export function getContentDay(date: string): ContentDay | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${CONTENT_KEY_PREFIX}${date}`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveContentDay(day: ContentDay): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${CONTENT_KEY_PREFIX}${day.date}`, JSON.stringify(day))
    // Recalculate feedback whenever we save
    recalculateFeedback()
  } catch {}
}

export function getFeedback(): ContentFeedback {
  if (typeof window === 'undefined') {
    return {
      topicsSelected: 0, topicsIgnored: 0,
      hooksSelected: 0, hooksIgnored: 0,
      goodPerformance: 0, poorPerformance: 0,
      topKeywords: [], avoidKeywords: [],
    }
  }
  try {
    const stored = localStorage.getItem(FEEDBACK_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return {
    topicsSelected: 0, topicsIgnored: 0,
    hooksSelected: 0, hooksIgnored: 0,
    goodPerformance: 0, poorPerformance: 0,
    topKeywords: [], avoidKeywords: [],
  }
}

function recalculateFeedback(): void {
  if (typeof window === 'undefined') return

  const feedback: ContentFeedback = {
    topicsSelected: 0, topicsIgnored: 0,
    hooksSelected: 0, hooksIgnored: 0,
    goodPerformance: 0, poorPerformance: 0,
    topKeywords: [], avoidKeywords: [],
  }

  const selectedWords: Record<string, number> = {}
  const avoidedWords: Record<string, number> = {}

  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CONTENT_KEY_PREFIX))
    for (const key of keys) {
      const day: ContentDay = JSON.parse(localStorage.getItem(key) || '{}')
      if (!day.topics) continue

      for (const topic of day.topics) {
        const words = topic.topic.toLowerCase().split(/\s+/)

        if (topic.selected) {
          feedback.topicsSelected++
          words.forEach(w => { if (w.length > 3) selectedWords[w] = (selectedWords[w] || 0) + 1 })
        } else {
          feedback.topicsIgnored++
          words.forEach(w => { if (w.length > 3) avoidedWords[w] = (avoidedWords[w] || 0) + 1 })
        }

        for (const hook of topic.hooks) {
          if (hook.selected) feedback.hooksSelected++
          else feedback.hooksIgnored++
          if (hook.performance === 'good') feedback.goodPerformance++
          if (hook.performance === 'poor') feedback.poorPerformance++
        }
      }
    }

    // Top keywords from selected topics
    feedback.topKeywords = Object.entries(selectedWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([w]) => w)

    feedback.avoidKeywords = Object.entries(avoidedWords)
      .filter(([w]) => !selectedWords[w])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w)

    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback))
  } catch {}
}

export function getAllContentDays(): ContentDay[] {
  if (typeof window === 'undefined') return []
  try {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(CONTENT_KEY_PREFIX))
      .sort()
      .reverse()
    return keys.map(k => JSON.parse(localStorage.getItem(k) || '{}')).filter(d => d.topics)
  } catch {
    return []
  }
}
