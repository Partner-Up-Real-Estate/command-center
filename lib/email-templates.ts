/**
 * Email templates for booking confirmations.
 * All templates return HTML strings for use with the Gmail send API.
 */

export interface BookingConfirmationParams {
  title: string
  date: string           // YYYY-MM-DD
  time: string           // HH:MM (24h)
  duration: number       // minutes
  meetingType: 'in_person' | 'google_meet' | 'phone_call'
  meetLink?: string      // Google Meet URL
  phoneNumber?: string
  location?: string
  description?: string
  organizerName: string
  organizerEmail: string
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const d = new Date(year, month - 1, day)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${dayNames[d.getDay()]}, ${months[month - 1]} ${day}, ${year}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`
  return `${h}h ${m}m`
}

function getMeetingTypeLabel(type: string): string {
  switch (type) {
    case 'google_meet': return 'Google Meet'
    case 'phone_call': return 'Phone Call'
    case 'in_person': return 'In Person'
    default: return 'Meeting'
  }
}

function getMeetingTypeIcon(type: string): string {
  switch (type) {
    case 'google_meet': return '📹'
    case 'phone_call': return '📞'
    case 'in_person': return '📍'
    default: return '📅'
  }
}

export function buildBookingConfirmationEmail(params: BookingConfirmationParams): string {
  const {
    title,
    date,
    time,
    duration,
    meetingType,
    meetLink,
    phoneNumber,
    location,
    description,
    organizerName,
    organizerEmail,
  } = params

  const formattedDate = formatDate(date)
  const formattedTime = formatTime(time)
  const formattedDuration = formatDuration(duration)
  const typeLabel = getMeetingTypeLabel(meetingType)
  const typeIcon = getMeetingTypeIcon(meetingType)

  // Calculate end time
  const [h, m] = time.split(':').map(Number)
  const startMin = h * 60 + m
  const endMin = startMin + duration
  const endH = Math.floor(endMin / 60) % 24
  const endM = endMin % 60
  const endAmpm = endH >= 12 ? 'PM' : 'AM'
  const endHour = endH % 12 || 12
  const endTime = `${endHour}:${String(endM).padStart(2, '0')} ${endAmpm}`

  // Build the connection details section
  let connectionHtml = ''
  if (meetingType === 'google_meet' && meetLink) {
    connectionHtml = `
      <tr>
        <td style="padding: 16px 24px; background-color: #f0f7ff; border-radius: 8px; margin: 8px 0;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 12px; vertical-align: middle;">
                <span style="font-size: 24px;">📹</span>
              </td>
              <td style="vertical-align: middle;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Join Google Meet</p>
                <a href="${meetLink}" style="color: #1a73e8; font-size: 15px; font-weight: 600; text-decoration: none;">${meetLink}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `
  } else if (meetingType === 'phone_call' && phoneNumber) {
    connectionHtml = `
      <tr>
        <td style="padding: 16px 24px; background-color: #f0fdf4; border-radius: 8px; margin: 8px 0;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 12px; vertical-align: middle;">
                <span style="font-size: 24px;">📞</span>
              </td>
              <td style="vertical-align: middle;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Dial In</p>
                <a href="tel:${phoneNumber.replace(/[^\d+]/g, '')}" style="color: #059669; font-size: 15px; font-weight: 600; text-decoration: none;">${phoneNumber}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `
  } else if (meetingType === 'in_person' && location) {
    connectionHtml = `
      <tr>
        <td style="padding: 16px 24px; background-color: #fefce8; border-radius: 8px; margin: 8px 0;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 12px; vertical-align: middle;">
                <span style="font-size: 24px;">📍</span>
              </td>
              <td style="vertical-align: middle;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Location</p>
                <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 600;">${location}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `
  }

  const descriptionHtml = description ? `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${description}</p>
      </td>
    </tr>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #378ADD 0%, #534AB7 100%); padding: 32px 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 28px;">${typeIcon}</p>
              <h1 style="margin: 0 0 4px 0; color: #ffffff; font-size: 20px; font-weight: 700;">Booking Confirmed</h1>
              <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 14px;">${typeLabel}</p>
            </td>
          </tr>

          <!-- Event Title -->
          <tr>
            <td style="padding: 24px 24px 8px 24px;">
              <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${title}</h2>
            </td>
          </tr>

          <!-- Date / Time Details -->
          <tr>
            <td style="padding: 8px 24px 16px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 10px; color: #9ca3af; font-size: 16px; vertical-align: middle;">📅</td>
                        <td style="vertical-align: middle;">
                          <span style="color: #374151; font-size: 14px; font-weight: 500;">${formattedDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 10px; color: #9ca3af; font-size: 16px; vertical-align: middle;">🕐</td>
                        <td style="vertical-align: middle;">
                          <span style="color: #374151; font-size: 14px; font-weight: 500;">${formattedTime} – ${endTime} HST</span>
                          <span style="color: #9ca3af; font-size: 13px; margin-left: 6px;">(${formattedDuration})</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Connection Details (Meet link / Phone / Location) -->
          ${connectionHtml}

          <!-- Description -->
          <tr>
            <td style="padding: 0 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${descriptionHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px 24px 24px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Scheduled by ${organizerName} · <a href="mailto:${organizerEmail}" style="color: #378ADD; text-decoration: none;">${organizerEmail}</a>
              </p>
              <p style="margin: 8px 0 0 0; color: #d1d5db; font-size: 11px; text-align: center;">
                Whiteridge Capital · Daily OS
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Template for rescheduling notifications
 */
export function buildRescheduleEmail(params: BookingConfirmationParams & { oldDate: string; oldTime: string }): string {
  const baseEmail = buildBookingConfirmationEmail(params)
  // Replace the header text
  return baseEmail
    .replace('Booking Confirmed', 'Meeting Rescheduled')
    .replace(
      '</h1>',
      `</h1>\n<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.7); font-size: 12px;">Previously: ${formatDate(params.oldDate)} at ${formatTime(params.oldTime)}</p>`
    )
}

/**
 * Template for cancellation notifications
 */
export function buildCancellationEmail(params: {
  title: string
  date: string
  time: string
  organizerName: string
  organizerEmail: string
  reason?: string
}): string {
  const formattedDate = formatDate(params.date)
  const formattedTime = formatTime(params.time)

  const reasonHtml = params.reason ? `
    <tr>
      <td style="padding: 12px 24px;">
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 600;">Reason:</p>
        <p style="margin: 0; color: #374151; font-size: 14px;">${params.reason}</p>
      </td>
    </tr>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: #dc2626; padding: 32px 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 28px;">❌</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Meeting Cancelled</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 18px; font-weight: 700; text-decoration: line-through; opacity: 0.6;">${params.title}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">📅 ${formattedDate} at ${formattedTime} HST</p>
            </td>
          </tr>
          ${reasonHtml}
          <tr>
            <td style="padding: 20px 24px 24px 24px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Cancelled by ${params.organizerName} · <a href="mailto:${params.organizerEmail}" style="color: #378ADD; text-decoration: none;">${params.organizerEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
