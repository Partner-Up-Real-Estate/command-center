'use client'

import React from 'react'

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
)

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 rounded-full transition-colors duration-200 ${
          checked ? 'bg-green-600' : 'bg-slate-600'
        }`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`inline-flex items-center justify-center h-7 w-7 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {checked && <CheckIcon />}
        </span>
      </button>
      {label && (
        <label className="text-sm font-medium text-white cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  )
}
