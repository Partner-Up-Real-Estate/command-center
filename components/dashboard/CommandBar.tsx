'use client'

import { useState, useRef, useEffect } from 'react'
import { CommandAction } from '@/types'
import { DAILY_BLOCKS } from '@/lib/blocks'
import { getDayState } from '@/lib/storage'

interface CommandBarProps {
  selectedDate: Date
  onAction: (action: CommandAction) => void
  pageContext?: string
}

interface AIResponse {
  actions: CommandAction[]
  message?: string
}

export default function CommandBar({ selectedDate, onAction, pageContext }: CommandBarProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [showResponse, setShowResponse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [micSupported, setMicSupported] = useState(true)
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) {
      setMicSupported(false)
      return
    }

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }
  }, [])

  // Auto-dismiss response after 8 seconds
  useEffect(() => {
    if (showResponse && !isLoading) {
      responseTimeoutRef.current = setTimeout(() => {
        setShowResponse(false)
        setResponse(null)
      }, 8000)
    }
    return () => {
      if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current)
    }
  }, [showResponse, isLoading])

  const handleMicClick = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
      }
    }
  }

  const buildCurrentState = () => {
    const dayState = getDayState(selectedDate)
    const blockSummaries = DAILY_BLOCKS.map(block => ({
      id: block.id,
      title: block.title,
      tasks: block.tasks,
    }))

    return {
      blocks: blockSummaries,
      checklist: dayState.checklist,
      kpis: dayState.kpis,
      scorecard: dayState.scorecard,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    const messageToSend = input

    try {
      const currentState = buildCurrentState()
      const dateStr = selectedDate.toISOString().split('T')[0]

      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          date: dateStr,
          currentState,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: AIResponse = await response.json()

      // Execute all non-event actions immediately
      data.actions?.forEach(action => {
        if (action.type !== 'create_event' && action.type !== 'message') {
          onAction(action)
        }
      })

      // Show create_event and message actions to user for confirmation
      setResponse(data)
      setShowResponse(true)
      setInput('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process command'
      setError(errorMsg)
      setResponse({
        actions: [
          {
            type: 'message',
            text: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
          },
        ],
      })
      setShowResponse(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEventConfirm = (action: CommandAction & { type: 'create_event' }) => {
    onAction(action)
    setShowResponse(false)
    setResponse(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      setShowResponse(false)
      setResponse(null)
      setInput('')
    }
  }

  return (
    <div className="w-full">
      {/* Main bar */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Sparkle icon */}
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-[#378ADD]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>

          {/* Input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you did, what to do, or ask me anything..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
            disabled={isLoading}
          />

          {/* Mic button */}
          {micSupported && (
            <button
              onClick={handleMicClick}
              disabled={isLoading}
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isListening
                  ? 'bg-red-500/20 border border-red-500'
                  : 'hover:bg-[#1C2333] border border-[#30363D]'
              }`}
              title="Voice input"
            >
              {isListening ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-5 h-5 bg-red-500/30 rounded-full animate-ping" />
                  <svg className="w-4 h-4 text-red-400 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </div>
              ) : (
                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#378ADD] hover:bg-[#2d6ab5] disabled:bg-slate-700 text-white flex items-center justify-center transition-colors"
            title="Send command"
          >
            {isLoading ? (
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-100" />
                <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-200" />
              </div>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16107126 C3.34915502,0.9039739 2.40734225,1.01511456 1.77946707,1.4863992 C0.994623095,2.11774789 0.837654326,3.20699836 1.15159189,3.99272531 L3.03521743,10.4337182 C3.03521743,10.5908156 3.19218622,10.7479129 3.50612381,10.7479129 L16.6915026,11.5334 C16.6915026,11.5334 17.1624089,11.5334 17.1624089,12.0046847 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Response area */}
      {showResponse && response && (
        <div className="mt-3 bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3 animate-in fade-in">
          {/* Display action feedback */}
          {response.actions?.map((action, idx) => {
            if (action.type === 'check_tasks') {
              return (
                <div key={idx} className="flex items-center gap-2 text-sm text-green-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span>Marked {action.items.length} task{action.items.length !== 1 ? 's' : ''} as complete</span>
                </div>
              )
            }
            if (action.type === 'update_kpi') {
              return (
                <div key={idx} className="flex items-center gap-2 text-sm text-blue-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                  </svg>
                  <span>Updated {action.field} to {action.value}</span>
                </div>
              )
            }
            if (action.type === 'check_scorecard') {
              return (
                <div key={idx} className="flex items-center gap-2 text-sm text-amber-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S15.33 8 14.5 8 13 8.67 13 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S8.33 8 7.5 8 6 8.67 6 9.5 6.67 11 7.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                  </svg>
                  <span>Marked {action.indices.length} scorecard item{action.indices.length !== 1 ? 's' : ''}</span>
                </div>
              )
            }
            if (action.type === 'create_event') {
              return (
                <div key={idx} className="border border-[#378ADD]/30 bg-[#378ADD]/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#378ADD]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
                    <span className="text-sm font-semibold text-white">New Event</span>
                  </div>
                  <div className="text-base font-medium text-white">{action.title}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-slate-500">Date</span><div className="text-white mt-0.5">{action.date}</div></div>
                    <div><span className="text-slate-500">Time</span><div className="text-white mt-0.5">{action.time}</div></div>
                    <div><span className="text-slate-500">Duration</span><div className="text-white mt-0.5">{action.duration}m</div></div>
                  </div>
                  {((action as any).attendeeDetails?.length > 0 || (action.attendees && action.attendees.length > 0)) && (
                    <div className="text-xs">
                      <span className="text-slate-500">Inviting:</span>
                      <div className="space-y-1 mt-1">
                        {(action as any).attendeeDetails ? (
                          (action as any).attendeeDetails.map((detail: { name: string; email: string }, i: number) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-[#1C2333] border border-[#30363D] rounded">
                              <div className="w-5 h-5 rounded-full bg-[#378ADD]/20 text-[#378ADD] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {detail.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-white font-medium truncate">{detail.name}</div>
                                {detail.email ? (
                                  <div className="text-slate-400 truncate">{detail.email}</div>
                                ) : (
                                  <div className="text-amber-400/70">Contact not found — won't be invited</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          action.attendees?.map((email, i) => (
                            <span key={i} className="inline-block px-2 py-0.5 bg-[#1C2333] border border-[#30363D] rounded text-slate-300 mr-1">{email}</span>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleEventConfirm(action)}
                      className="flex-1 px-3 py-2 bg-[#378ADD] hover:bg-[#2d6ab5] text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Confirm & Create
                    </button>
                    <button
                      onClick={() => setShowResponse(false)}
                      className="px-3 py-2 bg-[#1C2333] hover:bg-[#252D3A] text-slate-300 text-sm font-medium rounded-lg border border-[#30363D] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }
            if (action.type === 'message') {
              return (
                <div key={idx} className="text-sm text-slate-300">
                  {action.text}
                </div>
              )
            }
            return null
          })}

          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
