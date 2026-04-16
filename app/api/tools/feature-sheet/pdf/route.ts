import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFImage } from 'pdf-lib'
import { buildScenarioTable, fmtMoney, fmtPct, AMORTIZATION_YEARS } from '@/lib/mortgage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

// ─── Types ───────────────────────────────────────────────────────────────────

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
    galleryPhotos?: string[]
  }
  rate: number
  brand: {
    primaryColor: string   // hex "#378ADD"
    secondaryColor?: string
    logoUrl?: string
    logoPlacement?: 'header' | 'footer' | 'both'
  }
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
  disclaimers: {
    tableDisclaimer?: string
    tableDisclaimerEnabled?: boolean
    footerDisclaimer?: string
    footerDisclaimerEnabled?: boolean
  }
  sections: {
    gallery?: boolean
    paymentTable?: boolean
    brokerCard?: boolean
    agentCard?: boolean
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return rgb(r, g, b)
}

const WHITE = rgb(1, 1, 1)
const DARK = rgb(0.08, 0.09, 0.11)
const MID = rgb(0.45, 0.48, 0.52)
const LIGHT_BG = rgb(0.965, 0.97, 0.975)
const TABLE_ALT = rgb(0.945, 0.95, 0.96)

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
    return await doc.embedJpg(bytes)
  } catch {
    return null
  }
}

function drawText(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number }
) {
  let t = text
  const { x, y, size, font, color = DARK, maxWidth } = opts
  if (maxWidth) {
    while (font.widthOfTextAtSize(t, size) > maxWidth && t.length > 4) {
      t = t.slice(0, -2)
    }
    if (t !== text) t = t.slice(0, -1) + '…'
  }
  page.drawText(t, { x, y, size, font, color })
}

function drawTextCentered(
  page: PDFPage,
  text: string,
  opts: { centerX: number; y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb> }
) {
  const w = opts.font.widthOfTextAtSize(text, opts.size)
  drawText(page, text, { ...opts, x: opts.centerX - w / 2 })
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

/** Draw a filled rounded rectangle (approximated with 4 rects + 4 circles) */
function drawRoundedRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  r: number, color: ReturnType<typeof rgb>,
  opts?: { borderColor?: ReturnType<typeof rgb>; borderWidth?: number }
) {
  // Body rects (cross pattern for rounded corners)
  page.drawRectangle({ x: x + r, y, width: w - 2 * r, height: h, color })
  page.drawRectangle({ x, y: y + r, width: w, height: h - 2 * r, color })
  // Corner circles
  const cx = [x + r, x + w - r, x + r, x + w - r]
  const cy = [y + r, y + r, y + h - r, y + h - r]
  for (let i = 0; i < 4; i++) {
    page.drawCircle({ x: cx[i], y: cy[i], size: r, color })
  }
  // Border (optional, simple rect overlay)
  if (opts?.borderColor && opts?.borderWidth) {
    page.drawRectangle({
      x, y, width: w, height: h,
      borderColor: opts.borderColor,
      borderWidth: opts.borderWidth,
      color: rgb(0, 0, 0), opacity: 0,
    })
  }
}

/** Cover-fit an image into a rect (crop to fill) */
function drawImageCover(
  page: PDFPage, img: PDFImage,
  x: number, y: number, w: number, h: number
) {
  const imgAspect = img.width / img.height
  const boxAspect = w / h
  let drawW: number, drawH: number, drawX: number, drawY: number

  if (imgAspect > boxAspect) {
    // Image wider — fit height, crop sides
    drawH = h
    drawW = h * imgAspect
    drawX = x + (w - drawW) / 2
    drawY = y
  } else {
    // Image taller — fit width, crop top/bottom
    drawW = w
    drawH = w / imgAspect
    drawX = x
    drawY = y + (h - drawH) / 2
  }
  page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH })
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

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

    const brandColor = hexToRgb(payload.brand?.primaryColor || '#378ADD')
    const sections = {
      gallery: payload.sections?.gallery !== false,
      paymentTable: payload.sections?.paymentTable !== false,
      brokerCard: payload.sections?.brokerCard !== false,
      agentCard: payload.sections?.agentCard !== false,
    }

    const PAGE_W = 612
    const PAGE_H = 792
    const M = 28
    const CONTENT_W = PAGE_W - 2 * M
    const page = doc.addPage([PAGE_W, PAGE_H])

    // ═══════════════════════════════════════════════════════════════════════════
    // HERO SECTION — Full-width image with dark gradient overlay + text
    // ═══════════════════════════════════════════════════════════════════════════
    const HERO_H = 340

    // Draw hero background
    if (payload.listing.heroPhoto) {
      const hero = await fetchImage(doc, payload.listing.heroPhoto)
      if (hero) {
        drawImageCover(page, hero, 0, PAGE_H - HERO_H, PAGE_W, HERO_H)
      } else {
        page.drawRectangle({ x: 0, y: PAGE_H - HERO_H, width: PAGE_W, height: HERO_H, color: DARK })
      }
    } else {
      page.drawRectangle({ x: 0, y: PAGE_H - HERO_H, width: PAGE_W, height: HERO_H, color: DARK })
    }

    // Dark gradient overlay (simulate with semi-transparent rects from bottom up)
    const gradientSteps = 12
    for (let i = 0; i < gradientSteps; i++) {
      const frac = i / gradientSteps
      const opacity = 0.15 + frac * 0.55
      const stepH = HERO_H / gradientSteps
      page.drawRectangle({
        x: 0,
        y: PAGE_H - HERO_H + (gradientSteps - 1 - i) * stepH,
        width: PAGE_W,
        height: stepH + 1,
        color: rgb(0.04, 0.05, 0.07),
        opacity,
      })
    }

    // Logo in header (top right)
    const logoPlacement = payload.brand?.logoPlacement || 'header'
    let logoImage: PDFImage | null = null
    if (payload.brand?.logoUrl) {
      logoImage = await fetchImage(doc, payload.brand.logoUrl)
    }
    if (logoImage && (logoPlacement === 'header' || logoPlacement === 'both')) {
      const maxH = 30
      const scale = maxH / logoImage.height
      const lw = logoImage.width * scale
      page.drawImage(logoImage, {
        x: PAGE_W - M - lw,
        y: PAGE_H - M - maxH,
        width: lw,
        height: maxH,
      })
    }

    // Overlay text — centered, bottom third of hero
    const heroTextY = PAGE_H - HERO_H + 40

    // Price — dominant element
    const priceStr = fmtMoney(payload.listing.price)
    drawTextCentered(page, priceStr, {
      centerX: PAGE_W / 2,
      y: heroTextY + 80,
      size: 38,
      font: bold,
      color: WHITE,
    })

    // Address
    drawTextCentered(page, payload.listing.address, {
      centerX: PAGE_W / 2,
      y: heroTextY + 52,
      size: 16,
      font: bold,
      color: WHITE,
    })

    // Property details line
    const details: string[] = []
    if (payload.listing.beds) details.push(`${payload.listing.beds} Beds`)
    if (payload.listing.baths) details.push(`${payload.listing.baths} Baths`)
    if (payload.listing.sqft) details.push(`${payload.listing.sqft.toLocaleString()} Sq Ft`)
    if (payload.listing.propertyType) details.push(payload.listing.propertyType)
    if (details.length > 0) {
      drawTextCentered(page, details.join('   ·   '), {
        centerX: PAGE_W / 2,
        y: heroTextY + 30,
        size: 11,
        font,
        color: rgb(0.85, 0.87, 0.9),
      })
    }

    // MLS line
    if (payload.listing.mlsNumber) {
      drawTextCentered(page, `MLS® ${payload.listing.mlsNumber}`, {
        centerX: PAGE_W / 2,
        y: heroTextY + 12,
        size: 9,
        font,
        color: rgb(0.65, 0.68, 0.72),
      })
    }

    // Thin brand-colored accent bar under hero
    page.drawRectangle({
      x: 0,
      y: PAGE_H - HERO_H - 3,
      width: PAGE_W,
      height: 3,
      color: brandColor,
    })

    let cursorY = PAGE_H - HERO_H - 3

    // ═══════════════════════════════════════════════════════════════════════════
    // IMAGE GALLERY — Horizontal strip of 3-5 rounded thumbnails
    // ═══════════════════════════════════════════════════════════════════════════
    const gallery = (payload.listing.galleryPhotos || []).slice(0, 5)
    if (sections.gallery && gallery.length > 0) {
      cursorY -= 12
      const gap = 8
      const stripH = 80
      const thumbW = (CONTENT_W - gap * (gallery.length - 1)) / gallery.length

      for (let i = 0; i < gallery.length; i++) {
        const img = await fetchImage(doc, gallery[i])
        const x = M + i * (thumbW + gap)
        const y = cursorY - stripH

        // Rounded background placeholder
        drawRoundedRect(page, x, y, thumbW, stripH, 6, LIGHT_BG)

        if (img) {
          drawImageCover(page, img, x, y, thumbW, stripH)
        }
      }
      cursorY -= stripH + 14
    } else {
      cursorY -= 14
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAYMENT TABLE — Clean, modern, simplified columns
    // ═══════════════════════════════════════════════════════════════════════════
    if (sections.paymentTable) {
      const scenarios = buildScenarioTable(payload.listing.price, payload.rate).filter(
        s => !s.belowMinimum
      )

      // Section title
      const tableTitle = `Payment Scenarios  ·  ${fmtPct(payload.rate, 2)} Rate  ·  ${AMORTIZATION_YEARS}-Year Amortization`
      drawText(page, tableTitle, {
        x: M,
        y: cursorY - 12,
        size: 10,
        font: bold,
        color: DARK,
      })
      cursorY -= 22

      // Table container (rounded)
      const rowH = 24
      const headerH = 28
      const tableH = headerH + rowH * scenarios.length
      const tableY = cursorY - tableH
      drawRoundedRect(page, M, tableY, CONTENT_W, tableH, 8, LIGHT_BG)

      // Simplified columns: Down %, Down $, Mortgage, Insurance, Est. Payment
      const colWidths = [0.14, 0.22, 0.22, 0.20, 0.22]
      const colLabels = ['Down Payment', 'Down Amount', 'Mortgage', 'Default Insurance', 'Est. Payment']
      let colX = M + 12

      // Header row
      page.drawRectangle({
        x: M + 2,
        y: cursorY - headerH + 2,
        width: CONTENT_W - 4,
        height: headerH - 2,
        color: DARK,
        opacity: 0.9,
      })
      colX = M + 12
      for (let i = 0; i < colLabels.length; i++) {
        drawText(page, colLabels[i], {
          x: colX,
          y: cursorY - headerH + 10,
          size: 8,
          font: bold,
          color: WHITE,
        })
        colX += colWidths[i] * CONTENT_W
      }
      cursorY -= headerH

      // Data rows with alternating colors
      for (let r = 0; r < scenarios.length; r++) {
        const s = scenarios[r]
        const rowY = cursorY - rowH

        if (r % 2 === 1) {
          page.drawRectangle({
            x: M + 2,
            y: rowY,
            width: CONTENT_W - 4,
            height: rowH,
            color: TABLE_ALT,
          })
        }

        const cells = [
          fmtPct(s.downPct, 0),
          fmtMoney(s.downAmount),
          fmtMoney(s.totalLoan),
          s.insured ? fmtMoney(s.cmhcPremiumAmount) : '—',
          fmtMoney(s.monthlyPayment, 2) + '/mo',
        ]

        colX = M + 12
        for (let c = 0; c < cells.length; c++) {
          const isPayment = c === 4
          drawText(page, cells[c], {
            x: colX,
            y: rowY + 8,
            size: isPayment ? 10 : 9,
            font: isPayment ? bold : font,
            color: isPayment ? brandColor : DARK,
          })
          colX += colWidths[c] * CONTENT_W
        }
        cursorY -= rowH
      }

      cursorY -= 4

      // Table disclaimer
      if (payload.disclaimers?.tableDisclaimerEnabled !== false && payload.disclaimers?.tableDisclaimer) {
        const disclaimerLines = wrapLines(payload.disclaimers.tableDisclaimer, font, 7, CONTENT_W)
        for (const line of disclaimerLines.slice(0, 3)) {
          drawText(page, line, {
            x: M,
            y: cursorY - 10,
            size: 7,
            font: oblique,
            color: MID,
          })
          cursorY -= 9
        }
      } else {
        // Default disclaimer
        drawText(page, 'Rates subject to qualification and change. CMHC premium includes 0.20% surcharge for 30-year amortization.', {
          x: M,
          y: cursorY - 10,
          size: 7,
          font: oblique,
          color: MID,
          maxWidth: CONTENT_W,
        })
        cursorY -= 10
      }

      cursorY -= 10
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE CARDS — Side-by-side broker + agent cards
    // ═══════════════════════════════════════════════════════════════════════════
    const showBroker = sections.brokerCard
    const showAgent = sections.agentCard
    if (showBroker || showAgent) {
      const cardH = 90
      const cardGap = 12
      const cardW = showBroker && showAgent ? (CONTENT_W - cardGap) / 2 : CONTENT_W
      const cardY = Math.max(cursorY - cardH - 6, 46)

      // Broker card (left)
      if (showBroker) {
        const cx = M
        drawRoundedRect(page, cx, cardY, cardW, cardH, 8, LIGHT_BG)

        // Headshot circle placeholder
        const avatarSize = 22
        const avatarX = cx + 16 + avatarSize
        const avatarY = cardY + cardH - 24
        if (payload.broker.photoUrl) {
          const photo = await fetchImage(doc, payload.broker.photoUrl)
          if (photo) {
            page.drawCircle({ x: avatarX, y: avatarY, size: avatarSize, color: LIGHT_BG })
            page.drawImage(photo, {
              x: avatarX - avatarSize,
              y: avatarY - avatarSize,
              width: avatarSize * 2,
              height: avatarSize * 2,
            })
          } else {
            page.drawCircle({ x: avatarX, y: avatarY, size: avatarSize, color: rgb(0.85, 0.87, 0.9) })
          }
        } else {
          page.drawCircle({ x: avatarX, y: avatarY, size: avatarSize, color: rgb(0.85, 0.87, 0.9) })
        }

        // Text next to avatar
        const textX = cx + 16 + avatarSize * 2 + 12
        drawText(page, 'YOUR MORTGAGE BROKER', {
          x: textX,
          y: cardY + cardH - 14,
          size: 7,
          font: bold,
          color: brandColor,
        })
        drawText(page, payload.broker.name, {
          x: textX,
          y: cardY + cardH - 28,
          size: 13,
          font: bold,
          color: DARK,
        })
        if (payload.broker.title) {
          drawText(page, payload.broker.title, {
            x: textX,
            y: cardY + cardH - 41,
            size: 8,
            font,
            color: MID,
          })
        }
        // Contact info
        const bInfo: string[] = []
        if (payload.broker.phone) bInfo.push(payload.broker.phone)
        if (payload.broker.email) bInfo.push(payload.broker.email)
        if (payload.broker.brokerage) bInfo.push(payload.broker.brokerage)
        bInfo.forEach((line, i) => {
          drawText(page, line, {
            x: textX,
            y: cardY + cardH - 56 - i * 11,
            size: 8,
            font,
            color: DARK,
            maxWidth: cardW - (textX - cx) - 12,
          })
        })
      }

      // Agent card (right)
      if (showAgent) {
        const cx = showBroker ? M + cardW + cardGap : M
        drawRoundedRect(page, cx, cardY, cardW, cardH, 8, LIGHT_BG)

        const avatarSize = 22
        const avatarX = cx + 16 + avatarSize
        const avatarY = cardY + cardH - 24
        if (payload.realtor.photoUrl) {
          const photo = await fetchImage(doc, payload.realtor.photoUrl)
          if (photo) {
            page.drawCircle({ x: avatarX, y: avatarY, size: avatarSize, color: LIGHT_BG })
            page.drawImage(photo, {
              x: avatarX - avatarSize,
              y: avatarY - avatarSize,
              width: avatarSize * 2,
              height: avatarSize * 2,
            })
          } else {
            page.drawCircle({ x: avatarX, y: avatarY, size: avatarSize, color: rgb(0.85, 0.87, 0.9) })
          }
        } else {
          page.drawCircle({ x: avatarX, y: avatarY, size: avatarSize, color: rgb(0.85, 0.87, 0.9) })
        }

        const textX = cx + 16 + avatarSize * 2 + 12
        drawText(page, 'LISTING AGENT', {
          x: textX,
          y: cardY + cardH - 14,
          size: 7,
          font: bold,
          color: brandColor,
        })
        drawText(page, payload.realtor.name || 'Agent Name',  {
          x: textX,
          y: cardY + cardH - 28,
          size: 13,
          font: bold,
          color: DARK,
        })
        if (payload.realtor.brokerage) {
          drawText(page, payload.realtor.brokerage, {
            x: textX,
            y: cardY + cardH - 41,
            size: 8,
            font,
            color: MID,
          })
        }
        const rInfo: string[] = []
        if (payload.realtor.phone) rInfo.push(payload.realtor.phone)
        if (payload.realtor.email) rInfo.push(payload.realtor.email)
        rInfo.forEach((line, i) => {
          drawText(page, line, {
            x: textX,
            y: cardY + cardH - 56 - i * 11,
            size: 8,
            font,
            color: DARK,
            maxWidth: cardW - (textX - cx) - 12,
          })
        })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FOOTER — Clean, minimal disclaimer + date
    // ═══════════════════════════════════════════════════════════════════════════
    const footerH = 36
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: footerH, color: DARK })

    // Footer logo
    if (logoImage && (logoPlacement === 'footer' || logoPlacement === 'both')) {
      const maxH = 16
      const scale = maxH / logoImage.height
      const lw = logoImage.width * scale
      page.drawImage(logoImage, {
        x: M,
        y: (footerH - maxH) / 2,
        width: lw,
        height: maxH,
      })
    }

    // Footer disclaimer text
    if (payload.disclaimers?.footerDisclaimerEnabled !== false) {
      const footerText =
        payload.disclaimers?.footerDisclaimer ||
        'This is for illustrative purposes only and is not a commitment to lend. Contact your mortgage broker for personalized pre-qualification.'
      const fLines = wrapLines(footerText, font, 6.5, CONTENT_W - 60)
      fLines.slice(0, 2).forEach((line, i) => {
        drawText(page, line, {
          x: M + (logoImage && (logoPlacement === 'footer' || logoPlacement === 'both') ? 50 : 0),
          y: footerH - 12 - i * 8,
          size: 6.5,
          font,
          color: rgb(0.55, 0.58, 0.62),
        })
      })
    }

    // Date stamp
    const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
    drawText(page, dateStr, {
      x: PAGE_W - M - font.widthOfTextAtSize(dateStr, 6.5),
      y: footerH - 12,
      size: 6.5,
      font,
      color: rgb(0.5, 0.52, 0.56),
    })

    // ─── Save ────────────────────────────────────────────────────────────────
    const pdfBytes = await doc.save()
    const safeAddr = payload.listing.address.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48)
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
