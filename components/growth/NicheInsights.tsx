'use client'

import type { TrackedPost } from '@/types/index'

interface NicheInsightsProps {
  posts: TrackedPost[]
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'it', 'this', 'that', 'of', 'to', 'in', 'for', 'on', 'with',
  'and', 'or', 'but', 'at', 'by', 'from', 'as', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'which', 'who', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
])

function getWordFrequency(posts: TrackedPost[]): Array<[string, number]> {
  const wordMap = new Map<string, number>()

  posts.forEach((post) => {
    if (!post.caption) return

    const words = post.caption
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

    words.forEach((word) => {
      wordMap.set(word, (wordMap.get(word) || 0) + 1)
    })
  })

  return Array.from(wordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
}

function getPostingTimes(posts: TrackedPost[]): Array<{ hour: number; count: number; avgEngagement: number }> {
  const hourMap = new Map<number, { count: number; totalEngagement: number }>()

  posts.forEach((post) => {
    if (!post.postedAt) return
    const hour = new Date(post.postedAt).getHours()
    const engagement = post.likes + post.comments
    const existing = hourMap.get(hour) || { count: 0, totalEngagement: 0 }
    hourMap.set(hour, {
      count: existing.count + 1,
      totalEngagement: existing.totalEngagement + engagement,
    })
  })

  const result: Array<{ hour: number; count: number; avgEngagement: number }> = []
  for (let i = 0; i < 24; i++) {
    const data = hourMap.get(i)
    if (data) {
      result.push({
        hour: i,
        count: data.count,
        avgEngagement: data.totalEngagement / data.count,
      })
    }
  }
  return result
}

function getPostTypeStats(
  posts: TrackedPost[]
): Array<{ type: string; count: number; avgEngagement: number }> {
  const typeMap = new Map<string, { count: number; totalEngagement: number }>()

  posts.forEach((post) => {
    const type = post.postType || 'unknown'
    const engagement = post.likes + post.comments + post.views
    const existing = typeMap.get(type) || { count: 0, totalEngagement: 0 }
    typeMap.set(type, {
      count: existing.count + 1,
      totalEngagement: existing.totalEngagement + engagement,
    })
  })

  return Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      avgEngagement: data.totalEngagement / data.count,
    }))
    .sort((a, b) => b.count - a.count)
}

function SimpleBarChart({
  data,
  label,
  maxValue,
}: {
  data: Array<{ label: string; value: number }>
  label: string
  maxValue: number
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white">{label}</h4>
      <div className="space-y-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-[#8B949E] w-16 text-right">{item.label}</span>
            <div className="flex-1 h-6 bg-[#0D1117] border border-[#30363D] rounded overflow-hidden">
              <div
                className="h-full bg-[#378ADD] transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[#8B949E] w-12 text-right">{Math.round(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({
  data,
}: {
  data: Array<{ label: string; value: number }>
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const colors = ['#378ADD', '#534AB7', '#3B6D11', '#BA7517', '#A32D2D', '#888780']

  let currentAngle = 0
  const segments = data.map((item, idx) => {
    const percentage = item.value / total
    const angle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const r = 40
    const innerR = 25

    const x1 = 50 + r * Math.cos(startRad)
    const y1 = 50 + r * Math.sin(startRad)
    const x2 = 50 + r * Math.cos(endRad)
    const y2 = 50 + r * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    const ix1 = 50 + innerR * Math.cos(startRad)
    const iy1 = 50 + innerR * Math.sin(startRad)
    const ix2 = 50 + innerR * Math.cos(endRad)
    const iy2 = 50 + innerR * Math.sin(endRad)

    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ')

    currentAngle = endAngle

    return {
      path,
      color: colors[idx % colors.length],
      label: item.label,
      percentage: (percentage * 100).toFixed(0),
    }
  })

  return (
    <div className="flex items-center justify-center gap-8">
      <svg width="120" height="120" viewBox="0 0 100 100">
        {segments.map((segment, idx) => (
          <path key={idx} d={segment.path} fill={segment.color} stroke="#161B22" strokeWidth="1" />
        ))}
      </svg>
      <div className="space-y-2">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-[#8B949E]">
              {segment.label}: {segment.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function NicheInsights({ posts }: NicheInsightsProps) {
  const wordFrequency = getWordFrequency(posts)
  const postingTimes = getPostingTimes(posts)
  const postTypes = getPostTypeStats(posts)

  if (posts.length === 0) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
        <p className="text-[#8B949E] text-sm">
          Add tracked accounts and refresh data to see niche insights.
        </p>
      </div>
    )
  }

  const wordChartData = wordFrequency.map(([word, count]) => ({
    label: word,
    value: count,
  }))

  const timeChartData = postingTimes.map((item) => ({
    label: `${String(item.hour).padStart(2, '0')}:00`,
    value: item.avgEngagement,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Most Used Words */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <SimpleBarChart
          data={wordChartData}
          label="Most Used Words"
          maxValue={Math.max(...wordChartData.map((d) => d.value))}
        />
      </div>

      {/* Best Posting Times */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <SimpleBarChart
          data={timeChartData}
          label="Avg Engagement by Hour"
          maxValue={Math.max(...timeChartData.map((d) => d.value), 1)}
        />
      </div>

      {/* Best Post Types */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-6">Post Type Performance</h3>
        {postTypes.length > 0 ? (
          <DonutChart
            data={postTypes.map((type) => ({
              label: type.type.charAt(0).toUpperCase() + type.type.slice(1),
              value: type.count,
            }))}
          />
        ) : (
          <p className="text-center text-[#8B949E] text-sm py-8">No post type data available</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#378ADD] mb-1">{posts.length}</div>
          <div className="text-xs text-[#8B949E]">Total Posts</div>
        </div>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#378ADD] mb-1">
            {Math.round(posts.reduce((sum, p) => sum + (p.likes || 0), 0) / posts.length)}
          </div>
          <div className="text-xs text-[#8B949E]">Avg Likes</div>
        </div>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#378ADD] mb-1">
            {Math.round(posts.reduce((sum, p) => sum + (p.views || 0), 0) / posts.length)}
          </div>
          <div className="text-xs text-[#8B949E]">Avg Views</div>
        </div>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#378ADD] mb-1">
            {(
              posts.reduce((sum, p) => sum + (p.engagementRate || 0), 0) / posts.length
            ).toFixed(1)}
            %
          </div>
          <div className="text-xs text-[#8B949E]">Avg Engagement</div>
        </div>
      </div>
    </div>
  )
}
