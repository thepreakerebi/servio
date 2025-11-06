import { httpAction } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'

/**
 * Handle inbound email replies from Resend's "Receiving Emails" feature
 * This endpoint receives POST requests when emails are sent to your domain
 * Configure this in Resend dashboard under "Receiving Emails"
 * 
 * Note: This is separate from webhooks which handle outbound email status events
 */
export const handleInboundEmail = httpAction(async (ctx, request) => {
  try {
    // Parse the inbound email payload from Resend
    const payload = await request.json()

    // Extract ticket ID from reply email using multiple strategies
    const ticketId = extractTicketIdFromReply(payload)

    if (!ticketId) {
      console.warn(
        'Could not extract ticket ID from inbound email:',
        JSON.stringify(payload, null, 2),
      )
      return new Response('OK', { status: 200 })
    }

    // Validate ticket ID format (should be a valid Convex ID)
    if (!isValidTicketId(ticketId)) {
      console.warn(`Invalid ticket ID format: ${ticketId}`)
      return new Response('OK', { status: 200 })
    }

    // Get conversation for this ticket
    const conversation = await ctx.runQuery(
      internal.conversations.getByTicketId,
      {
        ticketId: ticketId as Id<'tickets'>,
      },
    )

    if (!conversation) {
      console.warn(`No conversation found for ticket: ${ticketId}`)
      return new Response('OK', { status: 200 })
    }

    // Extract email body and subject from payload
    const emailBody = extractEmailBody(payload)
    const emailSubject = extractEmailSubject(payload)

    if (!emailBody) {
      console.warn('No email body found in inbound email')
      return new Response('OK', { status: 200 })
    }

    // Add vendor reply to conversation
    await ctx.runMutation(internal.conversations.addMessage, {
      conversationId: conversation._id,
      sender: 'vendor',
      message: emailBody,
    })

    // Update ticket status to 'Replied' if not already in a later status
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: ticketId as Id<'tickets'>,
    })

    if (ticket && ticket.status !== 'Fixed') {
      await ctx.runMutation(internal.tickets.updateStatus, {
        ticketId: ticketId as Id<'tickets'>,
        status: 'Replied',
      })
    }

    // Forward reply to user
    await ctx.runAction(internal.emails.forwardToUser, {
      ticketId: ticketId as Id<'tickets'>,
      message: emailBody,
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error processing inbound email:', error)
    // Return 200 to prevent Resend from retrying
    return new Response('OK', { status: 200 })
  }
})

/**
 * Extract ticket ID from inbound email payload using multiple strategies:
 * 1. Subject line pattern: [Ticket #TICKET_ID]
 * 2. In-Reply-To header: ticket-TICKET_ID-timestamp
 * 3. References header: ticket-TICKET_ID-timestamp
 * 4. Email body search (fallback): looks for ticket ID patterns
 */
function extractTicketIdFromReply(payload: any): string | null {
  // Strategy 1: Extract from subject line
  // Format: [Ticket #TICKET_ID] or Re: [Ticket #TICKET_ID]
  const subject = payload.subject || payload.headers?.subject || ''
  const subjectMatch = subject.match(/\[Ticket #([^\]]+)\]/i)
  if (subjectMatch && subjectMatch[1]) {
    return subjectMatch[1]
  }

  // Strategy 2: Extract from In-Reply-To header
  // Format: <ticket-TICKET_ID-timestamp@domain> or ticket-TICKET_ID-timestamp
  const inReplyTo =
    payload.headers?.['In-Reply-To'] ||
    payload.headers?.['in-reply-to'] ||
    payload['In-Reply-To']
  if (inReplyTo) {
    const inReplyToMatch = inReplyTo.match(/ticket-([^-]+)-/)
    if (inReplyToMatch && inReplyToMatch[1]) {
      return inReplyToMatch[1]
    }
  }

  // Strategy 3: Extract from References header
  // Format: <ticket-TICKET_ID-timestamp@domain> or ticket-TICKET_ID-timestamp
  const references =
    payload.headers?.['References'] ||
    payload.headers?.['references'] ||
    payload.References
  if (references) {
    const referencesMatch = references.match(/ticket-([^-]+)-/)
    if (referencesMatch && referencesMatch[1]) {
      return referencesMatch[1]
    }
  }

  // Strategy 4: Extract from Message-ID header (if it contains ticket pattern)
  const messageId =
    payload.headers?.['Message-ID'] ||
    payload.headers?.['message-id'] ||
    payload['Message-ID']
  if (messageId) {
    const messageIdMatch = messageId.match(/ticket-([^-]+)-/)
    if (messageIdMatch && messageIdMatch[1]) {
      return messageIdMatch[1]
    }
  }

  // Strategy 5: Fallback - search email body for ticket ID pattern
  const body = extractEmailBody(payload)
  if (body) {
    const bodyMatch = body.match(/\[Ticket #([^\]]+)\]/i)
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1]
    }
  }

  return null
}

/**
 * Extract email body from inbound email payload
 * Handles different possible structures in Resend inbound email payloads
 */
function extractEmailBody(payload: any): string | null {
  // Try various possible fields for email body
  return (
    payload.body ||
    payload.text ||
    payload.html ||
    payload.content ||
    payload.message ||
    payload['body-plain'] ||
    payload['body-html'] ||
    null
  )
}

/**
 * Extract email subject from inbound email payload
 */
function extractEmailSubject(payload: any): string | null {
  return (
    payload.subject ||
    payload.headers?.subject ||
    payload.headers?.['Subject'] ||
    null
  )
}

/**
 * Validate that a string looks like a valid Convex ticket ID
 * Convex IDs are lowercase alphanumeric strings, can start with digits
 * Format: j1234567890abcdef or 1234567890abcdef
 */
function isValidTicketId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }

  // Convex IDs are lowercase alphanumeric, typically 16-17 characters
  // Allow IDs between 10-20 characters to be safe
  return /^[a-z0-9]+$/.test(id) && id.length >= 10 && id.length <= 20
}

