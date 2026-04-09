export interface BrandingConfig {
  platformName: string
  subtitle: string
  logoUrl: string | null  // base64 data URL or null for default
  accentColor: string
}

const STORAGE_KEY = 'cc_branding'

const DEFAULT_BRANDING: BrandingConfig = {
  platformName: 'Whiteridge',
  subtitle: 'Command Center',
  logoUrl: null,
  accentColor: '#378ADD',
}

export function getBranding(): BrandingConfig {
  if (typeof window === 'undefined') return DEFAULT_BRANDING
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_BRANDING, ...JSON.parse(stored) }
    }
  } catch {}
  return DEFAULT_BRANDING
}

export function saveBranding(config: Partial<BrandingConfig>): BrandingConfig {
  const current = getBranding()
  const updated = { ...current, ...config }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
  return updated
}

export function getLogoInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
