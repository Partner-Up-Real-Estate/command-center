/**
 * Unified Google Workspace API wrapper.
 * Covers Gmail, Drive, Tasks, Docs, Sheets.
 * Uses direct fetch calls with the user's OAuth accessToken.
 */

import { google } from 'googleapis'

function authClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return auth
}

// ============================================================================
// GMAIL
// ============================================================================

export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  to: string
  date: string
  body?: string
  unread?: boolean
}

export async function searchGmailMessages(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<GmailMessage[]> {
  try {
    const gmail = google.gmail({ version: 'v1', auth: authClient(accessToken) })
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    })

    const messages = list.data.messages || []
    const results = await Promise.all(
      messages.map(async m => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: m.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date'],
        })
        const headers = msg.data.payload?.headers || []
        const h = (name: string) =>
          headers.find(x => x.name?.toLowerCase() === name.toLowerCase())?.value || ''
        return {
          id: msg.data.id || '',
          threadId: msg.data.threadId || '',
          snippet: msg.data.snippet || '',
          subject: h('Subject'),
          from: h('From'),
          to: h('To'),
          date: h('Date'),
          unread: msg.data.labelIds?.includes('UNREAD') || false,
        } as GmailMessage
      })
    )
    return results
  } catch (error) {
    console.error('Gmail search error:', error)
    return []
  }
}

export async function getGmailThreadWithContact(
  accessToken: string,
  contactEmail: string,
  maxResults = 5
): Promise<GmailMessage[]> {
  return searchGmailMessages(
    accessToken,
    `from:${contactEmail} OR to:${contactEmail}`,
    maxResults
  )
}

export async function sendGmailMessage(
  accessToken: string,
  params: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    threadId?: string
    inReplyTo?: string
  }
): Promise<{ id: string; threadId: string }> {
  const gmail = google.gmail({ version: 'v1', auth: authClient(accessToken) })

  const toHeader = params.to.join(', ')
  const ccHeader = params.cc?.join(', ')
  const bccHeader = params.bcc?.join(', ')

  const headers: string[] = [
    `To: ${toHeader}`,
    ccHeader ? `Cc: ${ccHeader}` : '',
    bccHeader ? `Bcc: ${bccHeader}` : '',
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    params.inReplyTo ? `In-Reply-To: ${params.inReplyTo}` : '',
    params.inReplyTo ? `References: ${params.inReplyTo}` : '',
  ].filter(Boolean)

  const raw = [headers.join('\r\n'), '', params.body].join('\r\n')
  const encoded = Buffer.from(raw).toString('base64url')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      threadId: params.threadId,
    },
  })

  return { id: res.data.id || '', threadId: res.data.threadId || '' }
}

export async function createGmailDraft(
  accessToken: string,
  params: {
    to: string[]
    subject: string
    body: string
  }
): Promise<{ id: string; message: { id?: string | null } }> {
  const gmail = google.gmail({ version: 'v1', auth: authClient(accessToken) })

  const raw = [
    `To: ${params.to.join(', ')}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    params.body,
  ].join('\r\n')

  const encoded = Buffer.from(raw).toString('base64url')

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: encoded },
    },
  })

  return { id: res.data.id || '', message: { id: res.data.message?.id } }
}

// ============================================================================
// DRIVE
// ============================================================================

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink?: string
  webViewLink?: string
  thumbnailLink?: string
  modifiedTime?: string
  size?: string
}

export async function searchDriveFiles(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<DriveFile[]> {
  try {
    const drive = google.drive({ version: 'v3', auth: authClient(accessToken) })
    const res = await drive.files.list({
      q: `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
      pageSize: maxResults,
      fields: 'files(id,name,mimeType,iconLink,webViewLink,thumbnailLink,modifiedTime,size)',
      orderBy: 'modifiedTime desc',
    })
    return (res.data.files || []) as DriveFile[]
  } catch (error) {
    console.error('Drive search error:', error)
    return []
  }
}

export async function getRecentDriveFiles(
  accessToken: string,
  maxResults = 10
): Promise<DriveFile[]> {
  try {
    const drive = google.drive({ version: 'v3', auth: authClient(accessToken) })
    const res = await drive.files.list({
      pageSize: maxResults,
      fields: 'files(id,name,mimeType,iconLink,webViewLink,thumbnailLink,modifiedTime)',
      orderBy: 'modifiedTime desc',
      q: 'trashed = false',
    })
    return (res.data.files || []) as DriveFile[]
  } catch (error) {
    console.error('Drive recent error:', error)
    return []
  }
}

// ============================================================================
// GOOGLE TASKS
// ============================================================================

export interface GoogleTask {
  id: string
  title: string
  notes?: string
  status: 'needsAction' | 'completed'
  due?: string
  updated: string
  parent?: string
}

export async function listTaskLists(accessToken: string) {
  try {
    const tasks = google.tasks({ version: 'v1', auth: authClient(accessToken) })
    const res = await tasks.tasklists.list({ maxResults: 20 })
    return res.data.items || []
  } catch (error) {
    console.error('Task lists error:', error)
    return []
  }
}

export async function listTasks(
  accessToken: string,
  tasklistId = '@default',
  showCompleted = false
): Promise<GoogleTask[]> {
  try {
    const tasks = google.tasks({ version: 'v1', auth: authClient(accessToken) })
    const res = await tasks.tasks.list({
      tasklist: tasklistId,
      showCompleted,
      maxResults: 50,
    })
    return (res.data.items || []) as GoogleTask[]
  } catch (error) {
    console.error('Tasks list error:', error)
    return []
  }
}

export async function createTask(
  accessToken: string,
  params: { title: string; notes?: string; due?: string; tasklistId?: string }
): Promise<GoogleTask | null> {
  try {
    const tasks = google.tasks({ version: 'v1', auth: authClient(accessToken) })
    const res = await tasks.tasks.insert({
      tasklist: params.tasklistId || '@default',
      requestBody: {
        title: params.title,
        notes: params.notes,
        due: params.due,
      },
    })
    return res.data as GoogleTask
  } catch (error) {
    console.error('Create task error:', error)
    return null
  }
}

export async function completeTask(
  accessToken: string,
  taskId: string,
  tasklistId = '@default'
): Promise<boolean> {
  try {
    const tasks = google.tasks({ version: 'v1', auth: authClient(accessToken) })
    await tasks.tasks.patch({
      tasklist: tasklistId,
      task: taskId,
      requestBody: { status: 'completed' },
    })
    return true
  } catch (error) {
    console.error('Complete task error:', error)
    return false
  }
}

export async function deleteTask(
  accessToken: string,
  taskId: string,
  tasklistId = '@default'
): Promise<boolean> {
  try {
    const tasks = google.tasks({ version: 'v1', auth: authClient(accessToken) })
    await tasks.tasks.delete({ tasklist: tasklistId, task: taskId })
    return true
  } catch (error) {
    console.error('Delete task error:', error)
    return false
  }
}

// ============================================================================
// DOCS
// ============================================================================

export async function createMeetingNotesDoc(
  accessToken: string,
  params: { title: string; attendees?: string[]; agenda?: string }
): Promise<{ id: string; url: string } | null> {
  try {
    const drive = google.drive({ version: 'v3', auth: authClient(accessToken) })
    // Create a blank doc
    const file = await drive.files.create({
      requestBody: {
        name: params.title,
        mimeType: 'application/vnd.google-apps.document',
      },
      fields: 'id,webViewLink',
    })

    // If docs scope is granted, populate initial content
    if (file.data.id) {
      try {
        const docs = google.docs({ version: 'v1', auth: authClient(accessToken) })
        const content = [
          `${params.title}\n\n`,
          `Date: ${new Date().toLocaleDateString()}\n`,
          params.attendees?.length ? `Attendees: ${params.attendees.join(', ')}\n\n` : '\n',
          params.agenda ? `Agenda:\n${params.agenda}\n\n` : '',
          'Notes:\n\n\nAction Items:\n\n\nFollow-ups:\n',
        ].join('')

        await docs.documents.batchUpdate({
          documentId: file.data.id,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: content,
                },
              },
            ],
          },
        })
      } catch (e) {
        // Docs scope may not be granted for writing; doc still exists
        console.warn('Could not populate doc content:', e)
      }
    }

    return {
      id: file.data.id || '',
      url: file.data.webViewLink || `https://docs.google.com/document/d/${file.data.id}/edit`,
    }
  } catch (error) {
    console.error('Create meeting notes error:', error)
    return null
  }
}
