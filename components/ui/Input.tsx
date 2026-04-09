import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-white">
          {label}
        </label>
      )}
      <input
        className={`bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-[#378ADD] focus:outline-none transition-colors duration-200 ${
          error ? 'border-red-500/50' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
