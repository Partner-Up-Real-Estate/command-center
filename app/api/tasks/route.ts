import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listTasks, createTask, completeTask, deleteTask } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tasklistId = searchParams.get('list') || '@default'
    const showCompleted = searchParams.get('completed') === '1'

    const tasks = await listTasks(session.accessToken, tasklistId, showCompleted)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json({ tasks: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, notes, due, tasklistId } = body

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const task = await createTask(session.accessToken, { title, notes, due, tasklistId })
    if (!task) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, tasklistId, action } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    if (action === 'complete') {
      const ok = await completeTask(session.accessToken, taskId, tasklistId)
      return NextResponse.json({ success: ok })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Patch task error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const tasklistId = searchParams.get('list') || '@default'

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const ok = await deleteTask(session.accessToken, taskId, tasklistId)
    return NextResponse.json({ success: ok })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
