import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
// @ts-ignore (available at runtime on Vercel)
import chromium from '@sparticuz/chromium'

export interface ScrapedListing {
  source: 'rew' | 'realtor' | 'unknown'
  url: string
  price?: number
  address?: string
  city?: string
  province?: string
  postalCode?: string
  beds?: number
  baths?: number
  sqft?: number
  lotSize?: string
  yearBuilt?: number
  propertyType?: string
  mlsNumber?: string
  description?: string
  photos: string[]
  /** Raw structured data (JSON-LD) if present, for debugging */
  raw?: Record<string, unknown>
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'

function parseNumber(s: string | undefined | null): number | undefined {
  if (!s) return undefined
  const cleaned = s.replace(/[^0-9.]/g, '')
  if (!cleaned) return undefined
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function detectSource(url: string): ScrapedListing['source'] {
  const u = url.toLowerCase()
  if (u.includes('rew.ca')) return 'rew'
  if (u.includes('realtor.ca')) return 'realtor'
  return 'unknown'
}

/**
 * Extract JSON-LD `Product` / `Residence` / `SingleFamilyResidence` blocks.
 * Both rew.ca and many realtor.ca syndications include these.
 */
function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]').toArray()
  for (const el of scripts) {
    const text = $(el).contents().text()
    if (!text.trim()) continue
    try {
      const parsed = JSON.parse(text)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (
          item &&
          typeof item === 'object' &&
          (('@type' in item && /Residence|Product|Place|Offer|RealEstateListing/i.test(String(item['@type']))) ||
            'offers' in item ||
            'address' in item)
        ) {
          return item as Record<string, unknown>
        }
      }
    } catch {
      // ignore
    }
  }
  return null
}

function scrapeRew(html: string, url: string): ScrapedListing {
  const $ = cheerio.load(html)
  const listing: ScrapedListing = { source: 'rew', url, photos: [] }

  // JSON-LD first
  const ld = extractJsonLd($)
  if (ld) {
    listing.raw = ld
    const offers = (ld as any).offers
    if (offers?.price) listing.price = parseNumber(String(offers.price))
    const addr = (ld as any).address
    if (addr && typeof addr === 'object') {
      listing.address = [addr.streetAddress, addr.addressLocality, addr.addressRegion]
        .filter(Boolean)
        .join(', ')
      listing.city = addr.addressLocality
      listing.province = addr.addressRegion
      listing.postalCode = addr.postalCode
    }
    if ((ld as any).description) listing.description = String((ld as any).description)
    if ((ld as any).image) {
      const imgs = Array.isArray((ld as any).image) ? (ld as any).image : [(ld as any).image]
      listing.photos.push(...imgs.filter((i: unknown) => typeof i === 'string'))
    }
  }

  // DOM fallbacks — rew.ca markup
  if (!listing.price) {
    const priceText =
      $('[class*="price" i]').first().text() ||
      $('h2:contains("$")').first().text() ||
      $('meta[property="product:price:amount"]').attr('content')
    listing.price = parseNumber(priceText)
  }
  if (!listing.address) {
    listing.address =
      $('h1').first().text().trim() ||
      $('[class*="address" i]').first().text().trim() ||
      undefined
  }

  // Beds / baths / sqft - look for labeled values
  $('li, div, span').each((_: number, el: any) => {
    const t = $(el).text().trim()
    if (!t || t.length > 60) return
    if (!listing.beds && /^(\d+(?:\.\d+)?)\s*(bed|bd|bedroom)/i.test(t)) {
      listing.beds = parseNumber(t)
    }
    if (!listing.baths && /^(\d+(?:\.\d+)?)\s*(bath|ba|bathroom)/i.test(t)) {
      listing.baths = parseNumber(t)
    }
    if (!listing.sqft && /(sq\.?\s*ft|square\s*feet|sqft)/i.test(t)) {
      listing.sqft = parseNumber(t)
    }
  })

  // Photos - rew uses og:image + gallery imgs
  const og = $('meta[property="og:image"]').attr('content')
  if (og) listing.photos.push(og)
  $('img').each((_: number, el: any) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy')
    if (src && /\.(jpe?g|png|webp)/i.test(src) && !src.includes('logo') && !src.includes('icon')) {
      if (src.startsWith('http')) listing.photos.push(src)
    }
  })

  // Description
  if (!listing.description) {
    listing.description =
      $('meta[name="description"]').attr('content') ||
      $('[class*="description" i]').first().text().trim() ||
      undefined
  }

  // MLS
  const mlsMatch = html.match(/MLS[^A-Z0-9]*([A-Z]\d{6,})/i)
  if (mlsMatch) listing.mlsNumber = mlsMatch[1]

  listing.photos = dedupePhotos(listing.photos)
  return listing
}

function scrapeRealtor(html: string, url: string): ScrapedListing {
  // realtor.ca is heavy JS; raw HTML usually won't have full data.
  // We do the best-effort JSON-LD + og:image extraction.
  const $ = cheerio.load(html)
  const listing: ScrapedListing = { source: 'realtor', url, photos: [] }

  const ld = extractJsonLd($)
  if (ld) {
    listing.raw = ld
    const offers = (ld as any).offers
    if (offers?.price) listing.price = parseNumber(String(offers.price))
    const addr = (ld as any).address
    if (addr && typeof addr === 'object') {
      listing.address = [addr.streetAddress, addr.addressLocality, addr.addressRegion]
        .filter(Boolean)
        .join(', ')
      listing.city = addr.addressLocality
      listing.province = addr.addressRegion
      listing.postalCode = addr.postalCode
    }
    if ((ld as any).description) listing.description = String((ld as any).description)
    if ((ld as any).image) {
      const imgs = Array.isArray((ld as any).image) ? (ld as any).image : [(ld as any).image]
      listing.photos.push(...imgs.filter((i: unknown) => typeof i === 'string'))
    }
    if ((ld as any).numberOfRooms) listing.beds = parseNumber(String((ld as any).numberOfRooms))
    if ((ld as any).floorSize?.value) listing.sqft = parseNumber(String((ld as any).floorSize.value))
  }

  const og = $('meta[property="og:image"]').attr('content')
  if (og) listing.photos.unshift(og)

  // Try to extract from meta tags
  if (!listing.address) {
    listing.address = $('meta[property="og:title"]').attr('content') || undefined
  }
  if (!listing.description) {
    listing.description = $('meta[property="og:description"]').attr('content') || undefined
  }

  listing.photos = dedupePhotos(listing.photos)
  return listing
}

function dedupePhotos(photos: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of photos) {
    if (!p) continue
    // Normalize query strings to dedupe same image at different sizes
    const key = p.split('?')[0]
    if (!seen.has(key)) {
      seen.add(key)
      out.push(p)
    }
  }
  return out
}

async function scrapeWithBrowser(url: string): Promise<string> {
  let browser: any = null
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: isProduction
        ? await chromium.executablePath()
        : puppeteer.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    // Set realistic user agent and headers
    await page.setUserAgent(UA)
    await page.setViewport({ width: 1920, height: 1080 })

    // Navigate and wait for content
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    })

    // Wait for images to load (for og:image detection)
    await new Promise(r => setTimeout(r, 1000))

    const html = await page.content()
    return html
  } finally {
    if (browser) await browser.close()
  }
}

export async function scrapeListing(url: string): Promise<ScrapedListing> {
  const source = detectSource(url)
  let html: string | null = null

  // Try headless browser first (handles JS rendering + bot detection)
  try {
    html = await scrapeWithBrowser(url)
  } catch (browserErr) {
    console.warn('Browser scrape failed, falling back to fetch:', browserErr)
    // Fall back to simple fetch
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-CA,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        cache: 'no-store',
        timeout: 10000,
      } as RequestInit)
      if (!res.ok) {
        throw new Error(`Fetch failed (${res.status})`)
      }
      html = await res.text()
    } catch (fetchErr) {
      throw new Error(`Scraping failed: ${fetchErr instanceof Error ? fetchErr.message : 'Unknown error'}`)
    }
  }

  if (!html) {
    throw new Error('No content received from listing page')
  }
  if (source === 'rew') return scrapeRew(html, url)
  if (source === 'realtor') return scrapeRealtor(html, url)
  // Generic fallback — try rew parser (it's more permissive)
  return { ...scrapeRew(html, url), source: 'unknown' }
}
