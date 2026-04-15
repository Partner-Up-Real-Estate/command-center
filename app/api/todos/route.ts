import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import {
  getOrCreateUser,
  getTodosFromDB,
  saveTodosToDB,
  getCarryOverTodosFromDB,
} from '@/lib/supabase'

// GET /api/todos?date=YYYY-MM-DD — fetch todos for a date (+ carryover)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const date = request.nextUrl.searchParams.get('date')
    if (!date) {
      return NextResponse.json({ error: 'Missing date param' }, { status: 400 })
    }

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image)

    // Get todos for the requested date
    let todos = await getTodosFromDB(user.id, date)

    // If this date has no todos yet, check for carryover from previous days
    if (todos.length === 0) {
      const carryOver = await getCarryOverTodosFromDB(user.id, date)
      if (carryOver.length > 0) {
        // Create carried-over copies for today
        const carriedTodos = carryOver.map(t => ({
          text: t.text,
          completed: false,
          created_date: t.created_date,
          completed_date: null,
          carried_over: true,
        }))
        await saveTodosToDB(user.id, date, carriedTodos)
        todos = await getTodosFromDB(user.id, date)
      }
    }

    // Map to client format
    const clientTodos = todos.map(t => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      createdDate: t.created_date,
      completedDate: t.completed_date,
      carriedOver: t.carried_over,
    }))

    return NextResponse.json({ todos: clientTodos })
  } catch (error) {
    console.error('GET /api/todos error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/todos — save all todos for a date (full replace)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, todos } = body

    if (!date || !Array.isArray(todos)) {
      return NextResponse.json({ error: 'Missing date or todos array' }, { status: 400 })
    }

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image)

    await saveTodosToDB(user.id, date, todos.map((t: any) => ({
      text: t.text,
      completed: t.completed,
      created_date: t.createdDate || date,
      completed_date: t.completedDate || null,
      carried_over: t.carriedOver || false,
    })))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/todos error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
