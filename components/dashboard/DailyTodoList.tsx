'use client'

import { useEffect, useState, useCallback } from 'react'
import type { TodoItem } from '@/types'
import {
  getTodos,
  addTodos,
  toggleTodo,
  removeTodo,
  editTodo,
  carryOverTodos,
  getDayKey,
} from '@/lib/storage'

interface DailyTodoListProps {
  selectedDate: Date
  /** Called when the AI command bar produces todo items to preview */
  pendingItems?: string[]
  /** Clear the pending items after they're handled */
  onPendingHandled?: () => void
  onUpdate?: () => void
}

export default function DailyTodoList({
  selectedDate,
  pendingItems,
  onPendingHandled,
  onUpdate,
}: DailyTodoListProps) {
  const [todos, setTodosState] = useState<TodoItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewItems, setPreviewItems] = useState<string[]>([])
  const [quickAddText, setQuickAddText] = useState('')

  // Load todos + carry over on date change
  useEffect(() => {
    const carried = carryOverTodos(selectedDate)
    setTodosState(carried)
  }, [selectedDate])

  // When pending items arrive from AI command bar, show preview
  useEffect(() => {
    if (pendingItems && pendingItems.length > 0) {
      setPreviewItems([...pendingItems])
      setShowPreview(true)
    }
  }, [pendingItems])

  const refresh = useCallback(() => {
    setTodosState(getTodos(selectedDate))
    onUpdate?.()
  }, [selectedDate, onUpdate])

  const handleToggle = (id: string) => {
    const updated = toggleTodo(selectedDate, id)
    setTodosState(updated)
    onUpdate?.()
  }

  const handleRemove = (id: string) => {
    const updated = removeTodo(selectedDate, id)
    setTodosState(updated)
    onUpdate?.()
  }

  const handleEditStart = (todo: TodoItem) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  const handleEditSave = (id: string) => {
    if (editText.trim()) {
      const updated = editTodo(selectedDate, id, editText)
      setTodosState(updated)
      onUpdate?.()
    }
    setEditingId(null)
    setEditText('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleEditSave(id)
    if (e.key === 'Escape') {
      setEditingId(null)
      setEditText('')
    }
  }

  // Preview flow: edit individual items before confirming
  const handlePreviewEdit = (index: number, value: string) => {
    setPreviewItems(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  const handlePreviewRemove = (index: number) => {
    setPreviewItems(prev => prev.filter((_, i) => i !== index))
  }

  const handlePreviewConfirm = () => {
    const validItems = previewItems.filter(t => t.trim())
    if (validItems.length > 0) {
      const updated = addTodos(selectedDate, validItems)
      setTodosState(updated)
      onUpdate?.()
    }
    setShowPreview(false)
    setPreviewItems([])
    onPendingHandled?.()
  }

  const handlePreviewCancel = () => {
    setShowPreview(false)
    setPreviewItems([])
    onPendingHandled?.()
  }

  // Quick add (manual single item)
  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return
    const updated = addTodos(selectedDate, [quickAddText])
    setTodosState(updated)
    setQuickAddText('')
    onUpdate?.()
  }

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleQuickAdd()
  }

  const incomplete = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)
  const dateKey = getDayKey(selectedDate)

  return (
    <div className="bg-[#0D1117] border border-[#30363D] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#161B22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="text-sm font-bold text-white">Daily To-Dos</h3>
          {todos.length > 0 && (
            <span className="text-[10px] font-semibold bg-[#161B22] text-slate-400 px-1.5 py-0.5 rounded-full">
              {completed.length}/{todos.length}
            </span>
          )}
        </div>
        {todos.some(t => t.carriedOver) && (
          <span className="text-[10px] font-medium text-amber-400/70 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Carried over
          </span>
        )}
      </div>

      {/* Preview overlay for AI-parsed items */}
      {showPreview && previewItems.length > 0 && (
        <div className="border-b border-[#30363D] bg-[#378ADD]/5">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs">✨</span>
              <p className="text-xs font-semibold text-[#378ADD]">
                AI parsed {previewItems.length} to-do{previewItems.length > 1 ? 's' : ''} — review & confirm
              </p>
            </div>

            <div className="space-y-2">
              {previewItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <span className="text-[#378ADD] text-xs font-bold w-4 text-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => handlePreviewEdit(index, e.target.value)}
                    className="flex-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD] transition-colors"
                  />
                  <button
                    onClick={() => handlePreviewRemove(index)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handlePreviewConfirm}
                className="flex-1 px-4 py-2 bg-[#378ADD] text-white text-xs font-bold rounded-lg hover:bg-[#2d6ab5] active:bg-[#2560a0] transition-colors"
              >
                Add {previewItems.filter(t => t.trim()).length} to-do{previewItems.filter(t => t.trim()).length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={handlePreviewCancel}
                className="px-4 py-2 text-slate-400 text-xs font-semibold rounded-lg hover:bg-[#161B22] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Todo items */}
      <div className="px-4 py-2">
        {/* Quick add input */}
        <div className="flex items-center gap-2 py-2">
          <div className="w-5 h-5 rounded border border-dashed border-[#30363D] flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            value={quickAddText}
            onChange={e => setQuickAddText(e.target.value)}
            onKeyDown={handleQuickAddKeyDown}
            placeholder="Add a to-do or use the AI bar to brain dump..."
            className="flex-1 bg-transparent text-sm text-slate-400 placeholder-slate-600 focus:text-white focus:outline-none py-1"
          />
          {quickAddText.trim() && (
            <button
              onClick={handleQuickAdd}
              className="text-[#378ADD] text-xs font-bold px-2 py-1 rounded hover:bg-[#378ADD]/10 transition-colors"
            >
              Add
            </button>
          )}
        </div>

        {/* Empty state */}
        {todos.length === 0 && !showPreview && (
          <div className="py-6 text-center">
            <p className="text-slate-500 text-xs">No to-dos yet</p>
            <p className="text-slate-600 text-[10px] mt-1">
              Use the AI bar above to ramble about your tasks — it'll organize them for you
            </p>
          </div>
        )}

        {/* Incomplete items */}
        {incomplete.length > 0 && (
          <div className="space-y-0.5">
            {incomplete.map(todo => (
              <div
                key={todo.id}
                className="group flex items-start gap-2 py-2 rounded-lg hover:bg-[#161B22]/50 px-1 -mx-1 transition-colors"
              >
                <button
                  onClick={() => handleToggle(todo.id)}
                  className="mt-0.5 w-5 h-5 rounded border border-[#30363D] hover:border-[#378ADD] flex-shrink-0 transition-colors flex items-center justify-center"
                  aria-label="Complete todo"
                />

                {editingId === todo.id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => handleEditKeyDown(e, todo.id)}
                    onBlur={() => handleEditSave(todo.id)}
                    className="flex-1 bg-[#161B22] border border-[#378ADD] rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span
                    onDoubleClick={() => handleEditStart(todo)}
                    className="flex-1 text-sm text-slate-200 cursor-default leading-snug"
                  >
                    {todo.text}
                    {todo.carriedOver && (
                      <span className="ml-1.5 text-[10px] text-amber-400/60 font-medium">↩ carried</span>
                    )}
                  </span>
                )}

                <button
                  onClick={() => handleRemove(todo.id)}
                  className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  aria-label="Remove todo"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Completed items */}
        {completed.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#161B22]">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
              Completed ({completed.length})
            </p>
            <div className="space-y-0.5">
              {completed.map(todo => (
                <div
                  key={todo.id}
                  className="group flex items-start gap-2 py-1.5 rounded-lg hover:bg-[#161B22]/50 px-1 -mx-1 transition-colors"
                >
                  <button
                    onClick={() => handleToggle(todo.id)}
                    className="mt-0.5 w-5 h-5 rounded bg-[#378ADD]/20 border border-[#378ADD]/30 flex-shrink-0 flex items-center justify-center"
                    aria-label="Uncomplete todo"
                  >
                    <svg className="w-3 h-3 text-[#378ADD]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm text-slate-500 line-through leading-snug">
                    {todo.text}
                  </span>
                  <button
                    onClick={() => handleRemove(todo.id)}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    aria-label="Remove todo"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
