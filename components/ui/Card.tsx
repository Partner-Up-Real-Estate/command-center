import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export default function Card({
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={`bg-[#161B22] border border-[#30363D] rounded-xl ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  )
}
