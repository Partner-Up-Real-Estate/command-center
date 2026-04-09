import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Server-side client with service role (bypasses RLS)
// Will be null-ish if env vars aren't set (local dev without Supabase)
export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as any

function isConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey)
}

// Get or create a user by email
export async function getOrCreateUser(email: string, name?: string | null, image?: string | null) {
  if (!isConfigured()) return { id: 'local', email, name, image }
  // Try to find existing user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, email, name, image')
    .eq('email', email)
    .single()

  if (existing) {
    // Update name/image if changed
    if (name !== existing.name || image !== existing.image) {
      await supabaseAdmin
        .from('users')
        .update({ name, image, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return existing
  }

  // Create new user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, image })
    .select('id, email, name, image')
    .single()

  if (error) throw error
  return newUser!
}

// --- Day State ---

export async function getDayStateFromDB(userId: string, date: string) {
  if (!isConfigured()) return { checklist: {}, scorecard: {}, kpis: { convos: 0, booked: 0 } }
  const { data } = await supabaseAdmin
    .from('day_states')
    .select('checklist, scorecard, kpis')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (data) {
    return {
      checklist: data.checklist || {},
      scorecard: data.scorecard || {},
      kpis: data.kpis || { convos: 0, booked: 0 },
    }
  }

  return { checklist: {}, scorecard: {}, kpis: { convos: 0, booked: 0 } }
}

export async function saveDayStateToDB(
  userId: string,
  date: string,
  state: { checklist: Record<string, boolean>; scorecard: Record<number, boolean>; kpis: { convos: number; booked: number } }
) {
  if (!isConfigured()) return
  const { error } = await supabaseAdmin
    .from('day_states')
    .upsert(
      {
        user_id: userId,
        date,
        checklist: state.checklist,
        scorecard: state.scorecard,
        kpis: state.kpis,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )

  if (error) console.error('Error saving day state:', error)
}

// --- Branding ---

export async function getBrandingFromDB(userId: string) {
  if (!isConfigured()) return null
  const { data } = await supabaseAdmin
    .from('branding')
    .select('platform_name, subtitle, logo_url, accent_color')
    .eq('user_id', userId)
    .single()

  if (data) {
    return {
      platformName: data.platform_name,
      subtitle: data.subtitle,
      logoUrl: data.logo_url,
      accentColor: data.accent_color,
    }
  }
  return null
}

export async function saveBrandingToDB(
  userId: string,
  branding: { platformName: string; subtitle: string; logoUrl: string | null; accentColor: string }
) {
  if (!isConfigured()) return
  const { error } = await supabaseAdmin
    .from('branding')
    .upsert(
      {
        user_id: userId,
        platform_name: branding.platformName,
        subtitle: branding.subtitle,
        logo_url: branding.logoUrl,
        accent_color: branding.accentColor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) console.error('Error saving branding:', error)
}

// --- Content Engine ---

export async function getContentDayFromDB(userId: string, date: string) {
  if (!isConfigured()) return null
  const { data: contentDay } = await supabaseAdmin
    .from('content_days')
    .select('id, date, generated_at')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (!contentDay) return null

  const { data: topics } = await supabaseAdmin
    .from('content_topics')
    .select('id, brand, topic, angle, selected, sort_order')
    .eq('content_day_id', contentDay.id)
    .order('sort_order')

  if (!topics) return null

  const topicsWithHooks = await Promise.all(
    topics.map(async (t: Record<string, unknown>) => {
      const { data: hooks } = await supabaseAdmin
        .from('content_hooks')
        .select('id, text, selected, performance, sort_order')
        .eq('topic_id', t.id)
        .order('sort_order')

      return {
        id: t.id,
        brand: t.brand as 'broki' | 'whiteridge',
        topic: t.topic,
        angle: (t.angle as string) || '',
        selected: t.selected,
        hooks: (hooks || []).map((h: Record<string, unknown>) => ({
          id: h.id,
          text: h.text,
          selected: h.selected,
          performance: h.performance as 'none' | 'good' | 'poor',
        })),
        generatedAt: contentDay.generated_at,
      }
    })
  )

  return {
    date: contentDay.date,
    generatedAt: contentDay.generated_at,
    topics: topicsWithHooks,
  }
}

export async function saveContentDayToDB(
  userId: string,
  date: string,
  topics: Array<{
    brand: string
    topic: string
    angle: string
    hooks: string[]
  }>
) {
  if (!isConfigured()) return
  // Delete existing content for this day
  const { data: existing } = await supabaseAdmin
    .from('content_days')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (existing) {
    await supabaseAdmin.from('content_days').delete().eq('id', existing.id)
  }

  // Insert new content day
  const { data: contentDay, error } = await supabaseAdmin
    .from('content_days')
    .insert({ user_id: userId, date })
    .select('id')
    .single()

  if (error || !contentDay) throw error || new Error('Failed to create content day')

  // Insert topics and hooks
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i]
    const { data: topicRow } = await supabaseAdmin
      .from('content_topics')
      .insert({
        content_day_id: contentDay.id,
        brand: t.brand,
        topic: t.topic,
        angle: t.angle,
        sort_order: i,
      })
      .select('id')
      .single()

    if (topicRow) {
      const hookRows = t.hooks.map((text, idx) => ({
        topic_id: topicRow.id,
        text,
        sort_order: idx,
      }))
      await supabaseAdmin.from('content_hooks').insert(hookRows)
    }
  }
}

export async function updateTopicSelectedInDB(topicId: string, selected: boolean) {
  if (!isConfigured()) return
  await supabaseAdmin
    .from('content_topics')
    .update({ selected })
    .eq('id', topicId)
}

export async function updateHookInDB(hookId: string, updates: { selected?: boolean; performance?: string }) {
  if (!isConfigured()) return
  await supabaseAdmin
    .from('content_hooks')
    .update(updates)
    .eq('id', hookId)
}
