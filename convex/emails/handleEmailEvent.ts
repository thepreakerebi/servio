import { vEmailEvent, vEmailId } from '@convex-dev/resend'
import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Handle email status events from Resend webhooks
 * This is called automatically by the Resend component when email events occur
 * Events include: email.sent, email.delivered, email.bounced, email.complained, etc.
 * 
 * Note: To track email-to-ticket associations, we'd need to store emailId -> ticketId
 * mappings. For now, we log events for monitoring purposes.
 */
export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (ctx, args) => {
    // Handle email status events (delivered, bounced, spam complaints)
    // Update ticket/conversation status based on email events
    // This is called automatically by the Resend component when email events occur

    try {
      if (args.event.type === 'email.bounced') {
        // Email bounced - recipient address is invalid
        // TODO: If we stored emailId -> ticketId mappings, we could:
        // 1. Find the ticket associated with this email
        // 2. Update vendor email status (would need schema extension)
        // 3. Update ticket status to indicate email delivery failure
        // 4. Log bounce reason for debugging
        const bounceReason =
          (args.event.data as any)?.bounce?.reason ||
          (args.event.data as any)?.error ||
          'Unknown bounce reason'
        console.error(`Email ${args.id} bounced: ${bounceReason}`)
      }

      if (args.event.type === 'email.delivered') {
        // Email was successfully delivered
        // TODO: If we stored emailId -> ticketId mappings, we could:
        // 1. Confirm delivery for the associated ticket
        // 2. Update delivery metrics
        // 3. Mark email as delivered in tracking
        console.log(`Email ${args.id} delivered successfully`)
      }

      if (args.event.type === 'email.complained') {
        // Recipient marked email as spam
        // TODO: If we stored emailId -> ticketId mappings, we could:
        // 1. Find the vendor associated with this email
        // 2. Mark vendor as "doNotEmail" (would need schema extension)
        // 3. Update ticket status to indicate spam complaint
        // 4. Log complaint for review
        console.warn(`Email ${args.id} marked as spam/complaint`)
      }

      if (args.event.type === 'email.opened') {
        // Email was opened by recipient
        // Could track engagement metrics
        console.log(`Email ${args.id} was opened`)
      }

      if (args.event.type === 'email.clicked') {
        // Link in email was clicked
        // Could track engagement metrics
        console.log(`Email ${args.id} had a link clicked`)
      }
    } catch (error) {
      // Log errors but don't throw - we want email events to be processed
      // even if individual handlers fail
      console.error(`Error handling email event ${args.id}:`, error)
    }
  },
})

