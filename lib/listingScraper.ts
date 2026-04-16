import * as cheerio from 'cheerio'

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
  raw?: Record<string, unknown>
}

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

// ─── Transports ──────────────────────────────────────────────────────────────
// Ordered by reliability. Each returns { html, markdown } or null.

interface FetchResult {
  html: string | null
  markdown: string | null
}

/**
 * Jina AI Reader – free, no API key needed (20 req/min).
 * Uses headless Chrome internally → defeats Cloudflare / JS rendering.
 * We request BOTH html and markdown to maximize extraction.
 */
async function fetchViaJinaHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'X-Return-Format': 'html',
        'X-With-Generated-Alt': 'true',
        Accept: 'text/html',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const text = await res.text()
    if (text.trim().startsWith('<') && text.length > 500) return text
    return null
  } catch {
    return null
  }
}

async function fetchViaJinaMarkdown(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'X-Return-Format': 'markdown',
        'X-With-Images-Summary': 'all',
        'X-With-Links-Summary': 'true',
        Accept: 'text/markdown',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const text = await res.text()
    if (text.length > 200) return text
    return null
  } catch {
    return null
  }
}

async function fetchViaJinaJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'X-Return-Format': 'markdown',
        'X-With-Images-Summary': 'all',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data || json || null
  } catch {
    return null
  }
}

/**
 * ScraperAPI / ScrapingBee – paid services, if env vars are set.
 */
async function fetchViaPaidService(url: string): Promise<string | null> {
  const scraperKey = process.env.SCRAPER_API_KEY
  if (scraperKey) {
    const apiUrl = `https://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(url)}&render=true&country_code=ca`
    const res = await fetch(apiUrl, { cache: 'no-store' })
    if (res.ok) return await res.text()
  }
  const beeKey = process.env.SCRAPINGBEE_API_KEY
  if (beeKey) {
    const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${beeKey}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true&country_code=ca`
    const res = await fetch(apiUrl, { cache: 'no-store' })
    if (res.ok) return await res.text()
  }
  return null
}

// ─── Markdown parser ─────────────────────────────────────────────────────────
// Jina returns clean markdown even when HTML is blocked. This parser extracts
// listing fields from the text content.

function parseMarkdownListing(md: string, url: string): ScrapedListing {
  const source = detectSource(url)
  const listing: ScrapedListing = { source, url, photos: [] }

  // Price — look for $X,XXX,XXX patterns
  const priceMatch = md.match(/\$\s*([\d,]{5,})/m)
  if (priceMatch) listing.price = parseNumber(priceMatch[1])

  // Address — usually in the first heading or title
  // rew.ca format: "21037 77 Avenue, Langley, BC" or similar
  const titleMatch = md.match(/^#\s+(.+?)$/m)
  if (titleMatch) {
    let addr = titleMatch[1].trim()
    addr = addr.replace(/\s*[-|]\s*REW.*$/i, '').trim()
    addr = addr.replace(/\s*[-|]\s*REALTOR.*$/i, '').trim()
    // Remove markdown links
    addr = addr.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    if (addr.length > 5 && addr.length < 200) listing.address = addr
  }

  // Try to extract city/province from address
  if (listing.address) {
    const parts = listing.address.split(',').map(s => s.trim())
    if (parts.length >= 2) {
      listing.city = parts[parts.length - 2]
      listing.province = parts[parts.length - 1]
    }
  }

  // Beds — "X bed(room)(s)" or "X bd"
  const bedsMatch = md.match(/(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?|bd)/i)
  if (bedsMatch) listing.beds = parseNumber(bedsMatch[1])

  // Baths — "X bath(room)(s)" or "X ba"
  const bathsMatch = md.match(/(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?|ba\b)/i)
  if (bathsMatch) listing.baths = parseNumber(bathsMatch[1])

  // Sqft — "X,XXX sq ft" or "X,XXX sqft" or "X,XXX square feet"
  const sqftMatch = md.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i)
  if (sqftMatch) listing.sqft = parseNumber(sqftMatch[1])

  // Property type — common types
  const typeMatch = md.match(/\b(House|Townhouse|Condo|Apartment|Duplex|Semi-Detached|Detached|Single Family|Half Duplex)\b/i)
  if (typeMatch) listing.propertyType = typeMatch[1]

  // MLS — "MLS R1234567" or "MLS® R1234567"
  const mlsMatch = md.match(/MLS[®#\s]*([A-Z0-9]{6,})/i)
  if (mlsMatch) listing.mlsNumber = mlsMatch[1]

  // Year built
  const ybMatch = md.match(/(?:built|year built|year)[:\s]*((?:19|20)\d{2})/i)
  if (ybMatch) listing.yearBuilt = parseInt(ybMatch[1])

  // Lot size
  const lotMatch = md.match(/(?:lot|land)[:\s]*([\d,.]+\s*(?:sq\.?\s*ft|sqft|acres?))/i)
  if (lotMatch) listing.lotSize = lotMatch[1].trim()

  // Description — take a paragraph that looks like a listing description
  const descLines = md.split('\n').filter(l =>
    l.length > 80 && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('!')
  )
  if (descLines.length > 0) {
    listing.description = descLines[0].trim().slice(0, 500)
  }

  // Photos — extract all image URLs from markdown
  const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g
  let imgMatch
  while ((imgMatch = imgRegex.exec(md)) !== null) {
    const imgUrl = imgMatch[1]
    if (imgUrl.startsWith('http') && !imgUrl.includes('logo') && !imgUrl.includes('icon') && !imgUrl.includes('avatar')) {
      listing.photos.push(imgUrl)
    }
  }

  // Also grab bare image URLs
  const bareImgRegex = /https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp)(?:\?[^\s"'<>]*)?/gi
  let bareMatch
  while ((bareMatch = bareImgRegex.exec(md)) !== null) {
    if (!bareMatch[0].includes('logo') && !bareMatch[0].includes('icon')) {
      listing.photos.push(bareMatch[0])
    }
  }

  listing.photos = dedupePhotos(listing.photos)
  return listing
}

// ─── HTML parsers ────────────────────────────────────────────────────────────

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
          (('@type' in item &&
            /Residence|Product|Place|Offer|RealEstateListing|Apartment|House/i.test(
              String(item['@type'])
            )) ||
            'offers' in item ||
            ('address' in item && 'geo' in item))
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

function parseHtmlListing(html: string, url: string): ScrapedListing {
  const source = detectSource(url)
  const $ = cheerio.load(html)
  const listing: ScrapedListing = { source, url, photos: [] }

  // JSON-LD is the richest source
  const ld = extractJsonLd($)
  if (ld) {
    listing.raw = ld
    const offers = (ld as any).offers
    if (offers?.price) listing.price = parseNumber(String(offers.price))
    if (offers?.priceCurrency === 'CAD' && offers?.price)
      listing.price = parseNumber(String(offers.price))

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
    if ((ld as any).numberOfBedrooms) listing.beds = parseNumber(String((ld as any).numberOfBedrooms))
    if ((ld as any).numberOfBathroomsTotal)
      listing.baths = parseNumber(String((ld as any).numberOfBathroomsTotal))
    if ((ld as any).numberOfRooms && !listing.beds)
      listing.beds = parseNumber(String((ld as any).numberOfRooms))
    if ((ld as any).floorSize?.value) listing.sqft = parseNumber(String((ld as any).floorSize.value))
  }

  // Meta tag fallbacks
  if (!listing.price) {
    listing.price = parseNumber(
      $('meta[property="product:price:amount"]').attr('content') ||
        $('[class*="price" i]').first().text()
    )
  }
  if (!listing.address) {
    let addr =
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim()
    if (addr) {
      addr = addr.replace(/\s*[-|]\s*REW.*$/i, '').replace(/\s*[-|]\s*REALTOR.*$/i, '').trim()
      if (addr.length > 5) listing.address = addr
    }
  }

  // DOM sweep for beds/baths/sqft
  $('li, div, span, p, td').each((_: number, el: any) => {
    const t = $(el).text().trim()
    if (!t || t.length > 80) return
    if (!listing.beds && /(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?|bd)/i.test(t))
      listing.beds = parseNumber(t.match(/(\d+(?:\.\d+)?)\s*(?:bed|bd)/i)?.[1])
    if (!listing.baths && /(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?|ba\b)/i.test(t))
      listing.baths = parseNumber(t.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba\b)/i)?.[1])
    if (!listing.sqft && /([\d,]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i.test(t))
      listing.sqft = parseNumber(t.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft)/i)?.[1])
  })

  // Photos from og:image + img tags
  const og = $('meta[property="og:image"]').attr('content')
  if (og) listing.photos.unshift(og)
  $('img').each((_: number, el: any) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy')
    if (
      src &&
      /\.(jpe?g|png|webp)/i.test(src) &&
      !src.includes('logo') &&
      !src.includes('icon') &&
      src.startsWith('http')
    ) {
      listing.photos.push(src)
    }
  })

  if (!listing.description) {
    listing.description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      undefined
  }

  const mlsMatch = html.match(/MLS[®#\s]*([A-Z0-9]{6,})/i)
  if (mlsMatch) listing.mlsNumber = mlsMatch[1]

  listing.photos = dedupePhotos(listing.photos)
  return listing
}

function dedupePhotos(photos: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of photos) {
    if (!p) continue
    const key = p.split('?')[0]
    if (!seen.has(key)) {
      seen.add(key)
      out.push(p)
    }
  }
  return out
}

/** Merge two partial ScrapedListings, preferring non-empty values from `a` */
function mergeListing(a: ScrapedListing, b: ScrapedListing): ScrapedListing {
  return {
    source: a.source || b.source,
    url: a.url || b.url,
    price: a.price || b.price,
    address: a.address || b.address,
    city: a.city || b.city,
    province: a.province || b.province,
    postalCode: a.postalCode || b.postalCode,
    beds: a.beds ?? b.beds,
    baths: a.baths ?? b.baths,
    sqft: a.sqft ?? b.sqft,
    lotSize: a.lotSize || b.lotSize,
    yearBuilt: a.yearBuilt ?? b.yearBuilt,
    propertyType: a.propertyType || b.propertyType,
    mlsNumber: a.mlsNumber || b.mlsNumber,
    description: a.description || b.description,
    photos: a.photos.length > 0 ? a.photos : b.photos,
    raw: a.raw || b.raw,
  }
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export async function scrapeListing(url: string): Promise<ScrapedListing> {
  const errors: string[] = []
  let bestResult: ScrapedListing | null = null

  // 1. Try paid services first if configured (most reliable)
  try {
    const paidHtml = await fetchViaPaidService(url)
    if (paidHtml && paidHtml.length > 1000) {
      bestResult = parseHtmlListing(paidHtml, url)
      if (bestResult.price && bestResult.address) return bestResult
    }
  } catch (e) {
    errors.push(`Paid: ${e instanceof Error ? e.message : 'err'}`)
  }

  // 2. Jina Reader JSON mode (structured data with images list)
  try {
    const jinaJson = await fetchViaJinaJson(url)
    if (jinaJson) {
      // Jina JSON response contains: { content, images, ... }
      const mdContent = jinaJson.content || jinaJson.text || ''
      if (mdContent.length > 200) {
        const mdResult = parseMarkdownListing(mdContent, url)

        // Jina JSON also returns images array
        if (jinaJson.images && Array.isArray(jinaJson.images)) {
          const imgUrls = jinaJson.images
            .map((img: any) => typeof img === 'string' ? img : img?.url || img?.src)
            .filter((u: any) => typeof u === 'string' && u.startsWith('http') && !u.includes('logo') && !u.includes('icon'))
          mdResult.photos = dedupePhotos([...mdResult.photos, ...imgUrls])
        }

        bestResult = bestResult ? mergeListing(mdResult, bestResult) : mdResult
        if (bestResult.price && bestResult.address) return bestResult
      }
    }
  } catch (e) {
    errors.push(`Jina-JSON: ${e instanceof Error ? e.message : 'err'}`)
  }

  // 3. Jina Reader markdown mode (great for text extraction)
  try {
    const md = await fetchViaJinaMarkdown(url)
    if (md) {
      const mdResult = parseMarkdownListing(md, url)
      bestResult = bestResult ? mergeListing(bestResult, mdResult) : mdResult
      if (bestResult.price && bestResult.address) return bestResult
    }
  } catch (e) {
    errors.push(`Jina-MD: ${e instanceof Error ? e.message : 'err'}`)
  }

  // 4. Jina Reader HTML mode (for JSON-LD + meta tags)
  try {
    const html = await fetchViaJinaHtml(url)
    if (html) {
      const htmlResult = parseHtmlListing(html, url)
      bestResult = bestResult ? mergeListing(bestResult, htmlResult) : htmlResult
      if (bestResult.price && bestResult.address) return bestResult
    }
  } catch (e) {
    errors.push(`Jina-HTML: ${e instanceof Error ? e.message : 'err'}`)
  }

  // Return whatever we have, even if partial
  if (bestResult && (bestResult.price || bestResult.address)) {
    return bestResult
  }

  throw new Error(
    `Could not extract listing data. Tried: ${errors.join('; ') || 'all transports returned empty'}. ` +
      'Use the blank form to enter details manually.'
  )
}
