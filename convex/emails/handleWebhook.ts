import { httpAction } from '../_generated/server'
import { components, internal } from '../_generated/api'
import { Resend } from '@convex-dev/resend'

const resend = new Resend(components.resend, {
  testMode: process.env.NODE_ENV !== 'production',
})

export const handleWebhook = httpAction(async (ctx, request) => {
  return await resend.handleResendEventWebhook(ctx, request, async (event) => {
    // Handle email events (delivered, bounced, etc.)
    // Extract ticket ID from email headers or subject if it's a reply
    if (event.type === 'email.sent' || event.type === 'email.delivered') {
      // Parse email to extract ticket ID from thread ID
      // This would need to be implemented based on Resend's webhook payload
    }

    if (event.type === 'email.replied') {
      // Extract ticket ID from reply email
      const ticketId = extractTicketIdFromReply(event)
      if (ticketId) {
        // Get conversation
        const conversation = await ctx.runQuery(
          internal.conversations.getByTicketId,
          {
            ticketId: ticketId as any,
          },
        )

        if (conversation) {
          // Add vendor reply to conversation
          await ctx.runMutation(internal.conversations.addMessage, {
            conversationId: conversation._id,
            sender: 'vendor',
            message: (event.data as any)?.body || '',
          })

          // Update ticket status
          await ctx.runMutation(internal.tickets.updateStatus, {
            ticketId: ticketId as any,
            status: 'Replied',
          })

          // Optionally forward to user
          await ctx.runAction(internal.emails.forwardToUser, {
            ticketId: ticketId as any,
            message: (event.data as any)?.body || '',
          })
        }
      }
    }
  })
})

function extractTicketIdFromReply(event: any): string | null {
  // Extract ticket ID from email subject or headers
  // Format: [Ticket #TICKET_ID] or thread ID: ticket-TICKET_ID-timestamp
  const subject = event.data?.subject || ''
  const match = subject.match(/\[Ticket #([^\]]+)\]/)
  if (match) {
    return match[1]
  }

  const threadId =
    event.data?.headers?.['In-Reply-To'] ||
    event.data?.headers?.['References']
  if (threadId) {
    const threadMatch = threadId.match(/ticket-([^-]+)-/)
    if (threadMatch) {
      return threadMatch[1]
    }
  }

  return null
}

