import { Resend } from '@convex-dev/resend'
import { httpAction } from '../_generated/server'
import { components, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent,
})

/**
 * Helper function to handle conversational response to vendor emails
 */
async function handleConversationalResponse(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  params: {
    ticketId: Id<'tickets'>
    vendorId: Id<'vendors'>
    vendorEmail: string
    emailBody: string
    emailSubject: string | null
    conversation: { _id: Id<'conversations'>; messages: Array<any> }
  },
) {
  try {
    const conversationResponse = await ctx.runAction(
      internal.agents.vendorConversationAgent.generateVendorResponse,
      {
        ticketId: params.ticketId,
        vendorId: params.vendorId,
        vendorEmail: params.vendorEmail,
        vendorMessage: params.emailBody,
        conversationHistory: params.conversation.messages,
      },
    )

    // If agent determines we should respond, send the response
    if (conversationResponse.shouldRespond && conversationResponse.responseBody) {
      // Send conversational response email
      await resend.sendEmail(ctx, {
        from:
          process.env.RESEND_FROM_EMAIL ||
          'Servio Notifications <notifications@updates.shamp.io>',
        to: params.vendorEmail,
        replyTo: [
          process.env.RESEND_REPLY_TO_EMAIL || 'replies@updates.shamp.io',
        ],
        subject:
          conversationResponse.responseSubject ||
          `Re: [Ticket #${params.ticketId}] ${params.emailSubject || 'Maintenance Request'}`,
        html: conversationResponse.responseBody,
      })

      // Add agent response to conversation
      await ctx.runMutation(internal.conversations.addMessage, {
        conversationId: params.conversation._id,
        sender: 'agent',
        message: conversationResponse.responseBody,
      })
    }
  } catch (error) {
    console.error('Error generating conversational response:', error)
    // Continue even if conversational response fails
  }
}

/**
 * Handle inbound email replies from Resend's "Receiving Emails" feature
 * This endpoint receives POST requests when emails are sent to your receiving domain
 * Configure this in Resend dashboard under "Receiving Emails" → Webhooks
 * 
 * The webhook event type is "email.received" and includes:
 * - data.email_id: Unique email ID
 * - data.from: Sender email address
 * - data.to: Recipient email addresses
 * - data.subject: Email subject
 * - data.body/text/html: Email content
 * - data.headers: Email headers (In-Reply-To, References, etc.)
 * 
 * Note: This is separate from webhooks which handle outbound email status events
 */
export const handleInboundEmail = httpAction(async (ctx, request) => {
  try {
    // Parse the inbound email payload from Resend webhook
    const event = await request.json()

    // Verify this is an email.received event
    if (event.type !== 'email.received') {
      console.warn(`Unexpected event type: ${event.type}`)
      return new Response('OK', { status: 200 })
    }

    const payload = event.data || event

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

    // Get conversation for this ticket (use internal query for httpAction)
    const conversation = await ctx.runQuery(
      internal.conversations.getByTicketIdInternal,
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

    // Get ticket
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: ticketId as Id<'tickets'>,
    })

    if (!ticket) {
      console.warn(`Ticket not found: ${ticketId}`)
      return new Response('OK', { status: 200 })
    }

    // Find vendor outreach record by matching sender email
    // Extract sender email from payload
    const eventData = payload.data || payload
    const senderEmail =
      eventData.from?.email ||
      eventData.from ||
      payload.from?.email ||
      payload.from ||
      ''

    // Find vendor by email
    const vendor = await ctx.runQuery(internal.vendors.getByEmail, {
      email: senderEmail,
    })

    if (vendor) {
      // Find outreach record for this vendor and ticket
      const outreachRecords = await ctx.runQuery(
        internal.vendorOutreach.getByTicketId,
        {
          ticketId: ticketId as Id<'tickets'>,
        },
      )

      const outreach = outreachRecords.find(
        (o: (typeof outreachRecords)[number]) =>
          o.vendorId === vendor._id && o.status !== 'responded',
      )

      if (outreach) {
        // Parse vendor response using agent
        try {
          const quoteData = await ctx.runAction(
            internal.agents.vendorResponseAgent.parseVendorResponse,
            {
              ticketId: ticketId as Id<'tickets'>,
              vendorId: vendor._id,
              vendorOutreachId: outreach._id,
              emailBody,
              emailSubject: emailSubject || '',
            },
          )

          // If vendor provided a quote, create quote record
          // The refine validation ensures price, currency, and estimatedDeliveryTime are defined
          if (quoteData.hasQuote && !quoteData.isDeclining) {
            await ctx.runMutation(internal.vendorQuotes.create, {
              ticketId: ticketId as Id<'tickets'>,
              vendorId: vendor._id,
              vendorOutreachId: outreach._id,
              price: quoteData.price!,
              currency: quoteData.currency!,
              estimatedDeliveryTime: quoteData.estimatedDeliveryTime!,
              ratings: quoteData.ratings,
              responseText: emailBody,
            })

            // Update outreach status
            await ctx.runMutation(internal.vendorOutreach.updateStatus, {
              outreachId: outreach._id,
              status: 'responded',
            })

            // Rank vendors if we have multiple quotes
            await ctx.runAction(internal.agents.vendorRankingAgent.rankVendors, {
              ticketId: ticketId as Id<'tickets'>,
            })

            // Update ticket quote status
            await ctx.runMutation(internal.tickets.updateInternal, {
              ticketId: ticketId as Id<'tickets'>,
              quoteStatus: 'quotes_received',
            })
          } else if (quoteData.isDeclining) {
            // Vendor declined - update outreach status
            await ctx.runMutation(internal.vendorOutreach.updateStatus, {
              outreachId: outreach._id,
              status: 'responded',
            })
          }

          // Generate conversational response if needed
          // Check if vendor is asking questions or needs clarification
          await handleConversationalResponse(ctx, {
            ticketId: ticketId as Id<'tickets'>,
            vendorId: vendor._id,
            vendorEmail: senderEmail,
            emailBody,
            emailSubject,
            conversation,
          })
        } catch (error) {
          console.error('Error parsing vendor response:', error)
          // Continue to add message to conversation even if parsing fails
        }
      } else {
        // Vendor exists but no active outreach - still try to respond conversationally
        // This handles cases where vendor emails about an existing ticket
        await handleConversationalResponse(ctx, {
          ticketId: ticketId as Id<'tickets'>,
          vendorId: vendor._id,
          vendorEmail: senderEmail,
          emailBody,
          emailSubject,
          conversation,
        })
      }
    }

    // Add vendor reply to conversation
    await ctx.runMutation(internal.conversations.addMessage, {
      conversationId: conversation._id,
      sender: 'vendor',
      message: emailBody,
    })

    // Update ticket status to 'Replied' if not already in a later status
    if (ticket.status !== 'Fixed') {
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
  // Handle Resend webhook format: event.data contains the email data
  const eventData = payload.data || payload
  const headers = eventData.headers || payload.headers || {}

  // Strategy 1: Extract from subject line
  // Format: [Ticket #TICKET_ID] or Re: [Ticket #TICKET_ID]
  const subject = eventData.subject || payload.subject || headers.subject || ''
  const subjectMatch = subject.match(/\[Ticket #([^\]]+)\]/i)
  if (subjectMatch && subjectMatch[1]) {
    return subjectMatch[1]
  }

  // Strategy 2: Extract from In-Reply-To header
  // Format: <ticket-TICKET_ID-timestamp@domain> or ticket-TICKET_ID-timestamp
  const inReplyTo =
    headers['In-Reply-To'] ||
    headers['in-reply-to'] ||
    eventData['In-Reply-To'] ||
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
    headers['References'] ||
    headers['references'] ||
    eventData.References ||
    payload.References
  if (references) {
    const referencesMatch = references.match(/ticket-([^-]+)-/)
    if (referencesMatch && referencesMatch[1]) {
      return referencesMatch[1]
    }
  }

  // Strategy 4: Extract from Message-ID header (if it contains ticket pattern)
  const messageId =
    headers['Message-ID'] ||
    headers['message-id'] ||
    eventData['Message-ID'] ||
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
 * Handles Resend webhook format for email.received events
 * According to Resend docs, email content can be in various fields
 */
function extractEmailBody(payload: any): string | null {
  // Resend webhook format: data.text or data.html or data.body
  const eventData = payload.data || payload
  
  // Try various possible fields for email body
  return (
    eventData.text ||
    eventData.html ||
    eventData.body ||
    payload.text ||
    payload.html ||
    payload.body ||
    payload.content ||
    payload.message ||
    payload['body-plain'] ||
    payload['body-html'] ||
    null
  )
}

/**
 * Extract email subject from inbound email payload
 * Handles Resend webhook format for email.received events
 */
function extractEmailSubject(payload: any): string | null {
  const eventData = payload.data || payload
  const headers = eventData.headers || payload.headers || {}

  return (
    eventData.subject ||
    payload.subject ||
    headers.subject ||
    headers['Subject'] ||
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

