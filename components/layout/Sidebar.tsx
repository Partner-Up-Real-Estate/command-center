'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import React from 'react'
import { getBranding, getLogoInitial, type BrandingConfig } from '@/lib/branding'

const DashboardIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-5-7h4v4h-4z" />
  </svg>
)

const AnalyticsIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
)

const ContentIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z" />
  </svg>
)

const ToolsIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1 .1-1.4z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.62l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.48.1.62l2.03 1.58c-.05.3-.07.62-.07.94 0 .33.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.62l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.48-.12-.62l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  </svg>
)

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
  </svg>
)

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Calendar', href: '/calendar', icon: <CalendarIcon /> },
  { label: 'Content', href: '/content', icon: <ContentIcon /> },
  { label: 'Analytics', href: '/analytics', icon: <AnalyticsIcon /> },
  { label: 'Tools', href: '/tools/feature-sheet', icon: <ToolsIcon /> },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
]

function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [branding, setBranding] = useState<BrandingConfig>({
    platformName: 'Whiteridge',
    subtitle: 'Command Center',
    logoUrl: null,
    accentColor: '#378ADD',
  })

  useEffect(() => {
    setBranding(getBranding())
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)

    const handleBrandingUpdate = () => setBranding(getBranding())
    window.addEventListener('branding-updated', handleBrandingUpdate)
    return () => window.removeEventListener('branding-updated', handleBrandingUpdate)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar_collapsed', String(!prev))
      return !prev
    })
  }

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-[#0D1117] border-r border-[#161B22] transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex flex-col h-full pt-4 pb-4 px-2">
        {/* Logo */}
        <div className={`flex items-center mb-8 ${collapsed ? 'justify-center px-0' : 'gap-2 px-2'}`}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.platformName}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="flex items-center justify-center w-8 h-8 rounded font-bold text-white text-sm flex-shrink-0"
              style={{ backgroundColor: branding.accentColor }}
            >
              {getLogoInitial(branding.platformName)}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-white text-xs truncate">{branding.platformName}</div>
              <div className="text-slate-400 text-[10px] font-medium truncate">{branding.subtitle}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 mb-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded text-sm font-medium transition-colors duration-150 ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'text-[#378ADD] bg-[#378ADD]/10'
                    : 'text-[#8B949E] hover:text-white hover:bg-[#161B22]'
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapsed}
          className={`flex items-center gap-2 text-[#8B949E] hover:text-white text-xs font-medium rounded py-2 transition-colors ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* User Section */}
        {session?.user && (
          <div className="border-t border-[#161B22] pt-3 mt-2">
            {collapsed ? (
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sign Out"
                className="flex items-center justify-center w-full py-2 text-slate-400 hover:text-white transition-colors"
              >
                <LogoutIcon />
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-7 h-7 rounded flex-shrink-0 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-white truncate">
                      {session.user.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-transparent hover:bg-[#1C2333] text-slate-400 hover:text-white text-xs font-medium rounded border border-[#30363D] transition-colors duration-150"
                >
                  <LogoutIcon />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export default React.memo(Sidebar)
