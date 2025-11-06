import { vEmailEvent, vEmailId } from '@convex-dev/resend'
import { internalMutation } from '../_generated/server'
import { internal } from '../_generated/api'

/**
 * Handle email status events from Resend webhooks
 * This is called automatically by the Resend component when email events occur
 * Events include: email.sent, email.delivered, email.bounced, email.complained, etc.
 */
export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (ctx, args) => {
    try {
      const emailId = args.id as string

      // Find the email mapping to get associated ticket and vendor
      const mapping = await ctx.db
        .query('emailMappings')
        .withIndex('by_emailId', (q) => q.eq('emailId', emailId))
        .first()

      if (!mapping) {
        // No mapping found - this might be an email we didn't send or mapping wasn't stored
        console.warn(`No email mapping found for email ${emailId}`)
        return
      }

      const { ticketId, vendorId } = mapping

      if (args.event.type === 'email.bounced') {
        // Email bounced - recipient address is invalid
        const bounceReason =
          (args.event.data as any)?.bounce?.reason ||
          (args.event.data as any)?.error ||
          'Unknown bounce reason'

        // Update email mapping status
        await ctx.runMutation(internal.emails.updateEmailMappingStatus, {
          emailId,
          status: 'bounced',
          bounceReason,
        })

        // Update vendor email status to mark as bounced/invalid
        await ctx.runMutation(internal.emails.updateVendorEmailStatus, {
          vendorId,
          emailStatus: 'bounced',
          lastEmailError: bounceReason,
        })

        // Update ticket status to indicate email delivery failure
        const ticket = await ctx.db.get(ticketId)
        if (ticket && ticket.status === 'Sent') {
          await ctx.db.patch(ticketId, {
            status: 'Awaiting Vendor', // Revert to awaiting vendor since email failed
          })
        }

        console.error(
          `Email ${emailId} bounced for ticket ${ticketId}: ${bounceReason}`,
        )
      }

      if (args.event.type === 'email.delivered') {
        // Email was successfully delivered
        await ctx.runMutation(internal.emails.updateEmailMappingStatus, {
          emailId,
          status: 'delivered',
        })

        // Mark vendor email as valid if it was previously marked as invalid
        const vendor = await ctx.db.get(vendorId)
        if (vendor && vendor.emailStatus !== 'valid') {
          await ctx.runMutation(internal.emails.updateVendorEmailStatus, {
            vendorId,
            emailStatus: 'valid',
            clearError: true,
          })
        }

        console.log(
          `Email ${emailId} delivered successfully for ticket ${ticketId}`,
        )
      }

      if (args.event.type === 'email.complained') {
        // Recipient marked email as spam
        await ctx.runMutation(internal.emails.updateEmailMappingStatus, {
          emailId,
          status: 'complained',
        })

        // Mark vendor as doNotEmail to prevent future emails
        await ctx.runMutation(internal.emails.updateVendorEmailStatus, {
          vendorId,
          emailStatus: 'doNotEmail',
          lastEmailError: 'Email marked as spam/complaint',
        })

        // Update ticket status to indicate spam complaint
        const ticket = await ctx.db.get(ticketId)
        if (ticket && ticket.status !== 'Fixed') {
          await ctx.db.patch(ticketId, {
            status: 'Awaiting Vendor', // Revert status since vendor email is invalid
          })
        }

        console.warn(
          `Email ${emailId} marked as spam/complaint for ticket ${ticketId}`,
        )
      }

      if (args.event.type === 'email.opened') {
        // Email was opened by recipient
        await ctx.runMutation(internal.emails.updateEmailMappingStatus, {
          emailId,
          status: 'opened',
        })

        console.log(`Email ${emailId} was opened for ticket ${ticketId}`)
      }

      if (args.event.type === 'email.clicked') {
        // Link in email was clicked
        await ctx.runMutation(internal.emails.updateEmailMappingStatus, {
          emailId,
          status: 'clicked',
        })

        console.log(`Email ${emailId} had a link clicked for ticket ${ticketId}`)
      }
    } catch (error) {
      // Log errors but don't throw - we want email events to be processed
      // even if individual handlers fail
      console.error(`Error handling email event ${args.id}:`, error)
    }
  },
})
