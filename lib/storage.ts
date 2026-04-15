import { DayState, TodoItem } from '@/types'

const DEFAULT_DAY_STATE: DayState = {
  checklist: {},
  scorecard: {},
  kpis: {
    convos: 0,
    booked: 0,
  },
}

export function getDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDayState(date: Date): DayState {
  if (typeof window === 'undefined') {
    return DEFAULT_DAY_STATE
  }

  const key = getDayKey(date)
  const stored = localStorage.getItem(`day-state:${key}`)

  if (!stored) {
    return DEFAULT_DAY_STATE
  }

  try {
    return JSON.parse(stored)
  } catch {
    return DEFAULT_DAY_STATE
  }
}

export function setDayState(date: Date, state: DayState): void {
  if (typeof window === 'undefined') {
    return
  }

  const key = getDayKey(date)
  localStorage.setItem(`day-state:${key}`, JSON.stringify(state))

  // Sync to Supabase in the background (fire and forget)
  syncDayStateToServer(key, state)
}

export function updateChecklist(
  date: Date,
  key: string,
  value: boolean
): void {
  if (typeof window === 'undefined') return
  const state = getDayState(date)
  state.checklist[key] = value
  setDayState(date, state)
}

export function updateScorecard(
  date: Date,
  index: number,
  value: boolean
): void {
  if (typeof window === 'undefined') return
  const state = getDayState(date)
  state.scorecard[index] = value
  setDayState(date, state)
}

export function updateKPI(
  date: Date,
  field: 'convos' | 'booked',
  value: number
): void {
  if (typeof window === 'undefined') return
  const state = getDayState(date)
  state.kpis[field] = value
  setDayState(date, state)
}

// --- Supabase sync ---

let syncTimeout: NodeJS.Timeout | null = null
let pendingSync: { date: string; state: DayState } | null = null

function syncDayStateToServer(date: string, state: DayState) {
  // Debounce: wait 500ms after last change before syncing
  pendingSync = { date, state }
  if (syncTimeout) clearTimeout(syncTimeout)
  syncTimeout = setTimeout(async () => {
    if (!pendingSync) return
    const { date: d, state: s } = pendingSync
    pendingSync = null
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: d,
          checklist: s.checklist,
          scorecard: s.scorecard,
          kpis: s.kpis,
        }),
      })
    } catch (err) {
      console.error('Failed to sync day state to server:', err)
    }
  }, 500)
}

// Load state from server (called on mount to hydrate localStorage from Supabase)
export async function loadDayStateFromServer(date: Date): Promise<DayState> {
  const key = getDayKey(date)
  try {
    const res = await fetch(`/api/state?date=${key}`)
    if (res.ok) {
      const serverState: DayState = await res.json()
      // Check if server has data
      const hasData =
        Object.keys(serverState.checklist || {}).length > 0 ||
        Object.keys(serverState.scorecard || {}).length > 0 ||
        serverState.kpis.convos > 0 ||
        serverState.kpis.booked > 0

      if (hasData) {
        // Server has data — write to localStorage
        localStorage.setItem(`day-state:${key}`, JSON.stringify(serverState))
        return serverState
      }
    }
  } catch (err) {
    console.error('Failed to load day state from server:', err)
  }
  // Fall back to localStorage
  return getDayState(date)
}

// ============================================================================
// DAILY TODOS
// ============================================================================

function todosKey(dateKey: string): string {
  return `todos:${dateKey}`
}

export function getTodos(date: Date): TodoItem[] {
  if (typeof window === 'undefined') return []
  const key = getDayKey(date)
  const stored = localStorage.getItem(todosKey(key))
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function setTodos(date: Date, todos: TodoItem[]): void {
  if (typeof window === 'undefined') return
  const key = getDayKey(date)
  localStorage.setItem(todosKey(key), JSON.stringify(todos))
  // Sync to server in background
  syncTodosToServer(key, todos)
}

export function addTodos(date: Date, texts: string[]): TodoItem[] {
  const key = getDayKey(date)
  const existing = getTodos(date)
  const newItems: TodoItem[] = texts.map(text => ({
    id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    completed: false,
    createdDate: key,
    carriedOver: false,
  }))
  const all = [...existing, ...newItems]
  setTodos(date, all)
  return all
}

export function toggleTodo(date: Date, todoId: string): TodoItem[] {
  const key = getDayKey(date)
  const todos = getTodos(date)
  const updated = todos.map(t => {
    if (t.id === todoId) {
      return {
        ...t,
        completed: !t.completed,
        completedDate: !t.completed ? key : undefined,
      }
    }
    return t
  })
  setTodos(date, updated)
  return updated
}

export function removeTodo(date: Date, todoId: string): TodoItem[] {
  const todos = getTodos(date).filter(t => t.id !== todoId)
  setTodos(date, todos)
  return todos
}

export function editTodo(date: Date, todoId: string, newText: string): TodoItem[] {
  const todos = getTodos(date).map(t =>
    t.id === todoId ? { ...t, text: newText.trim() } : t
  )
  setTodos(date, todos)
  return todos
}

// --- Todos server sync (debounced, same pattern as day state) ---

let todoSyncTimeout: NodeJS.Timeout | null = null
let pendingTodoSync: { date: string; todos: TodoItem[] } | null = null

function syncTodosToServer(date: string, todos: TodoItem[]) {
  pendingTodoSync = { date, todos }
  if (todoSyncTimeout) clearTimeout(todoSyncTimeout)
  todoSyncTimeout = setTimeout(async () => {
    if (!pendingTodoSync) return
    const { date: d, todos: t } = pendingTodoSync
    pendingTodoSync = null
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: d, todos: t }),
      })
    } catch (err) {
      console.error('Failed to sync todos to server:', err)
    }
  }, 500)
}

/**
 * Load todos from the server and hydrate localStorage.
 * The server handles carryover automatically if the date has no todos yet.
 */
export async function loadTodosFromServer(date: Date): Promise<TodoItem[]> {
  const key = getDayKey(date)
  try {
    const res = await fetch(`/api/todos?date=${key}`)
    if (res.ok) {
      const data = await res.json()
      const serverTodos: TodoItem[] = data.todos || []

      if (serverTodos.length > 0) {
        // Server has data — write to localStorage
        localStorage.setItem(todosKey(key), JSON.stringify(serverTodos))
        return serverTodos
      }
    }
  } catch (err) {
    console.error('Failed to load todos from server:', err)
  }
  // Fall back to localStorage
  return getTodos(date)
}
