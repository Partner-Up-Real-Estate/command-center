'use client'

import { useEffect, useRef, useState } from 'react'

export interface Contact {
  name: string
  email: string
  photoUrl?: string
  phone?: string
  source?: 'contacts' | 'other' | 'directory'
}

interface ContactPickerProps {
  selected: Contact[]
  onChange: (contacts: Contact[]) => void
  placeholder?: string
  autoFocus?: boolean
  maxSelected?: number
  label?: string
}

export default function ContactPicker({
  selected,
  onChange,
  placeholder = 'Search contacts or type email...',
  autoFocus = false,
  maxSelected,
  label,
}: ContactPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Warm the contacts cache on mount
  useEffect(() => {
    fetch('/api/contacts/search?warm=1').catch(() => {})
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.trim().length < 1) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.contacts || data.results || [])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const addContact = (contact: Contact) => {
    if (maxSelected && selected.length >= maxSelected) return
    if (selected.find(c => c.email.toLowerCase() === contact.email.toLowerCase())) return
    onChange([...selected, contact])
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const removeContact = (email: string) => {
    onChange(selected.filter(c => c.email.toLowerCase() !== email.toLowerCase()))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (results.length > 0) {
        addContact(results[0])
      } else if (query.includes('@') && query.includes('.')) {
        // Allow free-form email entry
        addContact({ name: query.split('@')[0], email: query.trim() })
      }
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      removeContact(selected[selected.length - 1].email)
    }
  }

  return (
    <div className="relative">
      {label && (
        <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          {label}
        </label>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
          {selected.map(contact => (
            <span
              key={contact.email}
              className="inline-flex items-center gap-1.5 bg-[#378ADD]/15 border border-[#378ADD]/30 text-white rounded-full pl-1 pr-2 py-0.5 text-xs"
            >
              {contact.photoUrl ? (
                <img
                  src={contact.photoUrl}
                  alt={contact.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-[#378ADD] text-white text-[10px] font-bold flex items-center justify-center">
                  {(contact.name || contact.email)[0].toUpperCase()}
                </span>
              )}
              <span className="font-medium truncate max-w-[140px]">
                {contact.name || contact.email}
              </span>
              <button
                onClick={() => removeContact(contact.email)}
                className="text-slate-400 hover:text-white ml-0.5"
                aria-label={`Remove ${contact.name || contact.email}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD]"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {open && (results.length > 0 || (query.length >= 1 && !loading)) && (
        <div className="absolute left-0 right-0 mt-1 bg-[#0D1117] border border-[#30363D] rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto smooth-scroll">
          {results.length === 0 && query.length >= 1 && !loading && (
            <div className="px-3 py-3 text-xs text-slate-500 text-center">
              No contacts found
              {query.includes('@') && (
                <button
                  onClick={() =>
                    addContact({ name: query.split('@')[0], email: query.trim() })
                  }
                  className="block w-full mt-2 text-[#378ADD] hover:underline"
                >
                  Use "{query.trim()}" as email
                </button>
              )}
            </div>
          )}
          {results.map(contact => (
            <button
              key={contact.email}
              onMouseDown={e => {
                e.preventDefault()
                addContact(contact)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#161B22] active:bg-[#1C2333] text-left border-b border-[#161B22] last:border-b-0 transition-colors"
            >
              {contact.photoUrl ? (
                <img
                  src={contact.photoUrl}
                  alt={contact.name}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#378ADD] to-[#534AB7] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {(contact.name || contact.email)[0].toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {contact.name || contact.email.split('@')[0]}
                </div>
                <div className="text-xs text-slate-400 truncate">{contact.email}</div>
              </div>
              {contact.source === 'directory' && (
                <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  WORKSPACE
                </span>
              )}
              {contact.source === 'other' && (
                <span className="text-[9px] text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded">
                  RECENT
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
