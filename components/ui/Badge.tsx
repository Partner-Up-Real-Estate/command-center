import React from 'react'

type BlockCategory = 'mortgage' | 'broki' | 'personal' | 'content' | 'ops' | 'referrals'

interface BadgeProps {
  category: BlockCategory
}

const categoryConfig: Record<BlockCategory, { bg: string; text: string; label: string }> = {
  mortgage: { bg: 'bg-[#378ADD]/20', text: 'text-[#378ADD]', label: 'Mortgage' },
  broki: { bg: 'bg-[#534AB7]/20', text: 'text-[#534AB7]', label: 'Broki' },
  personal: { bg: 'bg-[#888780]/20', text: 'text-[#888780]', label: 'Personal' },
  content: { bg: 'bg-[#3B6D11]/20', text: 'text-[#3B6D11]', label: 'Content' },
  ops: { bg: 'bg-[#BA7517]/20', text: 'text-[#BA7517]', label: 'Operations' },
  referrals: { bg: 'bg-[#A32D2D]/20', text: 'text-[#A32D2D]', label: 'Referrals' },
}

export default function Badge({ category }: BadgeProps) {
  const config = categoryConfig[category]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  )
}
