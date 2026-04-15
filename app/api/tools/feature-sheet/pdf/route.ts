import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFImage } from 'pdf-lib'
import { buildScenarioTable, fmtMoney, fmtPct, AMORTIZATION_YEARS } from '@/lib/mortgage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface FeatureSheetPayload {
  listing: {
    price: number
    address: string
    city?: string
    province?: string
    beds?: number
    baths?: number
    sqft?: number
    propertyType?: string
    mlsNumber?: string
    description?: string
    heroPhoto?: string
    stripPhotos?: string[]
  }
  rate: number // annual, e.g. 0.0479
  broker: {
    name: string
    title?: string
    phone?: string
    email?: string
    brokerage?: string
    license?: string
    photoUrl?: string
  }
  realtor: {
    name: string
    title?: string
    phone?: string
    email?: string
    brokerage?: string
    photoUrl?: string
  }
  footer?: string
}

// Brand colors
const BLUE = rgb(0x37 / 255, 0x8a / 255, 0xdd / 255)
const DARK = rgb(0.1, 0.12, 0.15)
const MID = rgb(0.35, 0.4, 0.45)
const LIGHT = rgb(0.92, 0.93, 0.95)
const WHITE = rgb(1, 1, 1)

async function fetchImage(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    const ctype = res.headers.get('content-type') || ''
    if (ctype.includes('png') || url.toLowerCase().endsWith('.png')) {
      return await doc.embedPng(bytes)
    }
    // default to jpg
    return await doc.embedJpg(bytes)
  } catch {
    return null
  }
}

function drawText(
  page: PDFPage,
  text: string,
  opts: {
    x: number
    y: number
    size: number
    font: PDFFont
    color?: ReturnType<typeof rgb>
    maxWidth?: number
  }
) {
  const { x, y, size, font, color = DARK, maxWidth } = opts
  let t = text
  if (maxWidth) {
    while (font.widthOfTextAtSize(t, size) > maxWidth && t.length > 4) {
      t = t.slice(0, -2)
    }
    if (t !== text) t = t.slice(0, -1) + '…'
  }
  page.drawText(t, { x, y, size, font, color })
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as FeatureSheetPayload
    if (!payload?.listing?.price || !payload?.listing?.address) {
      return NextResponse.json({ error: 'Missing listing price or address' }, { status: 400 })
    }

    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const oblique = await doc.embedFont(StandardFonts.HelveticaOblique)

    // Letter portrait: 612 x 792
    const PAGE_W = 612
    const PAGE_H = 792
    const M = 36 // margin
    const page = doc.addPage([PAGE_W, PAGE_H])

    // ─── Header band ─────────────────────────────────────────────────────────
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 54,
      width: PAGE_W,
      height: 54,
      color: DARK,
    })
    drawText(page, 'MORTGAGE FEATURE SHEET', {
      x: M,
      y: PAGE_H - 32,
      size: 14,
      font: bold,
      color: WHITE,
    })
    drawText(page, payload.broker.brokerage || 'Whiteridge Mortgage', {
      x: PAGE_W - M - bold.widthOfTextAtSize(payload.broker.brokerage || 'Whiteridge Mortgage', 10),
      y: PAGE_H - 32,
      size: 10,
      font: bold,
      color: BLUE,
    })

    // ─── Hero image ──────────────────────────────────────────────────────────
    let cursorY = PAGE_H - 54 - 8
    const heroH = 220
    if (payload.listing.heroPhoto) {
      const hero = await fetchImage(doc, payload.listing.heroPhoto)
      if (hero) {
        const w = PAGE_W - 2 * M
        const scale = Math.min(w / hero.width, heroH / hero.height)
        const drawW = hero.width * scale
        const drawH = hero.height * scale
        // center horizontally, place within band
        page.drawRectangle({
          x: M,
          y: cursorY - heroH,
          width: w,
          height: heroH,
          color: LIGHT,
        })
        page.drawImage(hero, {
          x: M + (w - drawW) / 2,
          y: cursorY - heroH + (heroH - drawH) / 2,
          width: drawW,
          height: drawH,
        })
      }
    } else {
      page.drawRectangle({
        x: M,
        y: cursorY - heroH,
        width: PAGE_W - 2 * M,
        height: heroH,
        color: LIGHT,
      })
      drawText(page, 'No photo provided', {
        x: PAGE_W / 2 - 40,
        y: cursorY - heroH / 2,
        size: 10,
        font: oblique,
        color: MID,
      })
    }
    cursorY -= heroH + 8

    // ─── Photo strip (up to 4 thumbs) ────────────────────────────────────────
    const strip = (payload.listing.stripPhotos || []).slice(0, 4)
    if (strip.length > 0) {
      const gap = 6
      const stripH = 60
      const thumbW = (PAGE_W - 2 * M - gap * (strip.length - 1)) / strip.length
      for (let i = 0; i < strip.length; i++) {
        const img = await fetchImage(doc, strip[i])
        const x = M + i * (thumbW + gap)
        page.drawRectangle({
          x,
          y: cursorY - stripH,
          width: thumbW,
          height: stripH,
          color: LIGHT,
        })
        if (img) {
          const scale = Math.min(thumbW / img.width, stripH / img.height)
          const w = img.width * scale
          const h = img.height * scale
          page.drawImage(img, {
            x: x + (thumbW - w) / 2,
            y: cursorY - stripH + (stripH - h) / 2,
            width: w,
            height: h,
          })
        }
      }
      cursorY -= stripH + 10
    }

    // ─── Title + key facts ───────────────────────────────────────────────────
    drawText(page, payload.listing.address, {
      x: M,
      y: cursorY - 14,
      size: 14,
      font: bold,
      color: DARK,
      maxWidth: PAGE_W - 2 * M - 140,
    })
    // Price on right
    const priceStr = fmtMoney(payload.listing.price)
    drawText(page, priceStr, {
      x: PAGE_W - M - bold.widthOfTextAtSize(priceStr, 16),
      y: cursorY - 14,
      size: 16,
      font: bold,
      color: BLUE,
    })
    cursorY -= 20

    // Sub-facts line
    const facts: string[] = []
    if (payload.listing.beds) facts.push(`${payload.listing.beds} bed`)
    if (payload.listing.baths) facts.push(`${payload.listing.baths} bath`)
    if (payload.listing.sqft) facts.push(`${payload.listing.sqft.toLocaleString()} sqft`)
    if (payload.listing.propertyType) facts.push(payload.listing.propertyType)
    if (payload.listing.mlsNumber) facts.push(`MLS ${payload.listing.mlsNumber}`)
    if (facts.length > 0) {
      drawText(page, facts.join('  ·  '), {
        x: M,
        y: cursorY - 12,
        size: 9,
        font,
        color: MID,
      })
      cursorY -= 16
    }

    cursorY -= 4

    // ─── Mortgage scenario table ─────────────────────────────────────────────
    const scenarios = buildScenarioTable(payload.listing.price, payload.rate).filter(
      s => !s.belowMinimum
    )

    // Table header
    const tableTitle = `Payment Scenarios  ·  ${fmtPct(payload.rate, 2)}  ·  ${AMORTIZATION_YEARS}-yr amort`
    drawText(page, tableTitle, {
      x: M,
      y: cursorY - 12,
      size: 11,
      font: bold,
      color: DARK,
    })
    cursorY -= 18

    const colX = [M, M + 60, M + 140, M + 220, M + 310, M + 400, M + 490]
    const headers = ['Down %', 'Down $', 'Base Loan', 'CMHC', 'Total Loan', 'Monthly', 'Bi-weekly']
    // Header row
    page.drawRectangle({
      x: M,
      y: cursorY - 16,
      width: PAGE_W - 2 * M,
      height: 16,
      color: DARK,
    })
    for (let i = 0; i < headers.length; i++) {
      drawText(page, headers[i], {
        x: colX[i] + 4,
        y: cursorY - 12,
        size: 8,
        font: bold,
        color: WHITE,
      })
    }
    cursorY -= 16

    // Rows
    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i]
      const rowH = 18
      if (i % 2 === 0) {
        page.drawRectangle({
          x: M,
          y: cursorY - rowH,
          width: PAGE_W - 2 * M,
          height: rowH,
          color: LIGHT,
        })
      }
      const row = [
        fmtPct(s.downPct, 0),
        fmtMoney(s.downAmount),
        fmtMoney(s.baseLoan),
        s.insured ? fmtMoney(s.cmhcPremiumAmount) : '—',
        fmtMoney(s.totalLoan),
        fmtMoney(s.monthlyPayment, 2),
        fmtMoney(s.biweeklyPayment, 2),
      ]
      for (let c = 0; c < row.length; c++) {
        drawText(page, row[c], {
          x: colX[c] + 4,
          y: cursorY - 13,
          size: 9,
          font: c === 5 ? bold : font,
          color: c === 5 ? BLUE : DARK,
        })
      }
      cursorY -= rowH
    }

    cursorY -= 6
    drawText(
      page,
      'Calculations use Canadian semi-annual compounding. CMHC premium includes 0.20% surcharge for 30-year amortization. Rates and qualification subject to change and lender approval.',
      {
        x: M,
        y: cursorY - 10,
        size: 7,
        font: oblique,
        color: MID,
        maxWidth: PAGE_W - 2 * M,
      }
    )
    cursorY -= 18

    // ─── Broker + Realtor block ──────────────────────────────────────────────
    const contactBlockH = 96
    const contactY = Math.max(cursorY - contactBlockH, 70)

    // Broker (left half)
    page.drawRectangle({
      x: M,
      y: contactY,
      width: (PAGE_W - 2 * M) / 2 - 4,
      height: contactBlockH,
      color: DARK,
    })
    drawText(page, 'YOUR MORTGAGE BROKER', {
      x: M + 12,
      y: contactY + contactBlockH - 16,
      size: 8,
      font: bold,
      color: BLUE,
    })
    drawText(page, payload.broker.name, {
      x: M + 12,
      y: contactY + contactBlockH - 32,
      size: 12,
      font: bold,
      color: WHITE,
    })
    if (payload.broker.title) {
      drawText(page, payload.broker.title, {
        x: M + 12,
        y: contactY + contactBlockH - 46,
        size: 8,
        font,
        color: rgb(0.75, 0.78, 0.82),
      })
    }
    const bLines: string[] = []
    if (payload.broker.phone) bLines.push(payload.broker.phone)
    if (payload.broker.email) bLines.push(payload.broker.email)
    if (payload.broker.license) bLines.push(`Lic. ${payload.broker.license}`)
    bLines.forEach((line, i) => {
      drawText(page, line, {
        x: M + 12,
        y: contactY + contactBlockH - 62 - i * 11,
        size: 8,
        font,
        color: WHITE,
      })
    })

    // Realtor (right half)
    const rxStart = M + (PAGE_W - 2 * M) / 2 + 4
    const rxWidth = (PAGE_W - 2 * M) / 2 - 4
    page.drawRectangle({
      x: rxStart,
      y: contactY,
      width: rxWidth,
      height: contactBlockH,
      color: WHITE,
      borderColor: DARK,
      borderWidth: 1,
    })
    drawText(page, 'LISTING AGENT', {
      x: rxStart + 12,
      y: contactY + contactBlockH - 16,
      size: 8,
      font: bold,
      color: BLUE,
    })
    drawText(page, payload.realtor.name, {
      x: rxStart + 12,
      y: contactY + contactBlockH - 32,
      size: 12,
      font: bold,
      color: DARK,
    })
    if (payload.realtor.brokerage) {
      drawText(page, payload.realtor.brokerage, {
        x: rxStart + 12,
        y: contactY + contactBlockH - 46,
        size: 8,
        font,
        color: MID,
      })
    }
    const rLines: string[] = []
    if (payload.realtor.phone) rLines.push(payload.realtor.phone)
    if (payload.realtor.email) rLines.push(payload.realtor.email)
    rLines.forEach((line, i) => {
      drawText(page, line, {
        x: rxStart + 12,
        y: contactY + contactBlockH - 62 - i * 11,
        size: 8,
        font,
        color: DARK,
      })
    })

    // ─── Footer ──────────────────────────────────────────────────────────────
    const footerY = 32
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: footerY,
      color: DARK,
    })
    const footerText =
      payload.footer ||
      'This is an illustrative scenario, not a commitment to lend. Contact your broker for personalized qualification.'
    const footerLines = wrapLines(footerText, font, 7, PAGE_W - 2 * M)
    footerLines.slice(0, 2).forEach((line, i) => {
      drawText(page, line, {
        x: M,
        y: footerY - 12 - i * 8,
        size: 7,
        font,
        color: rgb(0.7, 0.73, 0.78),
      })
    })
    const dateStr = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    drawText(page, `Generated ${dateStr}`, {
      x: PAGE_W - M - font.widthOfTextAtSize(`Generated ${dateStr}`, 7),
      y: 10,
      size: 7,
      font,
      color: rgb(0.6, 0.63, 0.68),
    })

    const pdfBytes = await doc.save()
    // Sanitize filename
    const safeAddr = payload.listing.address
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
    const filename = `feature-sheet-${safeAddr || 'listing'}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
