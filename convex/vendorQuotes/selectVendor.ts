import { Resend } from '@convex-dev/resend'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, components, internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent as any,
})

/**
 * Select a vendor from recommendations
 * This marks the vendor as selected and sends confirmation/rejection emails
 */
export const selectVendor = action({
  args: {
    ticketId: v.id('tickets'),
    quoteId: v.id('vendorQuotes'),
  },
  handler: async (ctx, args): Promise<{
    success: boolean
    vendorId: Id<'vendors'>
    quoteId: Id<'vendorQuotes'>
  }> => {
    // Require authentication
    const user: Doc<'users'> | null = await ctx.runQuery(
      api.users.getCurrent as any,
      {},
    )
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to select vendor for this ticket')
    }

    // Get quote
    const quote: Doc<'vendorQuotes'> | null = await ctx.runQuery(
      internal.vendorQuotes.getByIdInternal as any,
      {
        quoteId: args.quoteId,
      },
    )

    if (!quote) {
      throw new Error('Quote not found')
    }

    if (quote.ticketId !== args.ticketId) {
      throw new Error('Quote does not belong to this ticket')
    }

    if (quote.status !== 'received') {
      throw new Error('Quote is not in received status')
    }

    // Get vendor
    const vendor: Doc<'vendors'> | null = await ctx.runQuery(
      internal.vendors.getByIdInternal as any,
      {
        vendorId: quote.vendorId,
      },
    )

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Get all quotes for this ticket
    const allQuotes: Array<Doc<'vendorQuotes'>> = await ctx.runQuery(
      internal.vendorQuotes.getByTicketIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    // Collect vendor IDs and fetch all vendors in batch
    const vendorIds = allQuotes
      .filter((q: Doc<'vendorQuotes'>) => q._id !== args.quoteId && q.status === 'received')
      .map((q: Doc<'vendorQuotes'>) => q.vendorId)

    // Fetch all vendors at once
    const vendors: Array<Doc<'vendors'> | null> = await Promise.all(
      vendorIds.map(async (vendorId: Id<'vendors'>) =>
        await ctx.runQuery(internal.vendors.getByIdInternal as any, {
          vendorId,
        }),
      ),
    )

    // Create vendor map
    const vendorMap = new Map<Id<'vendors'>, Doc<'vendors'>>(
      vendors
        .filter((v): v is Doc<'vendors'> => v !== null)
        .map((v) => [v._id, v]),
    )

    // Mark selected quote as selected
    await ctx.runMutation(internal.vendorQuotes.updateStatus as any, {
      quoteId: args.quoteId,
      status: 'selected',
    })

    // Mark all other received quotes as rejected and send rejection emails
    for (const otherQuote of allQuotes) {
      if (otherQuote._id !== args.quoteId && otherQuote.status === 'received') {
        await ctx.runMutation(internal.vendorQuotes.updateStatus as any, {
          quoteId: otherQuote._id,
          status: 'rejected',
        })

        // Send rejection email to non-selected vendors
        const otherVendor = vendorMap.get(otherQuote.vendorId)

        if (otherVendor && otherVendor.emailStatus !== 'doNotEmail') {
          try {
            await resend.sendEmail(ctx, {
              from:
                process.env.RESEND_FROM_EMAIL ||
                'Servio Notifications <notifications@updates.shamp.io>',
              to: otherVendor.email,
              replyTo: [
                process.env.RESEND_REPLY_TO_EMAIL || 'replies@updates.shamp.io',
              ],
              subject: `[Ticket #${args.ticketId}] Thank you for your quote`,
              html: `
                <p>Dear ${otherVendor.businessName},</p>
                <p>Thank you for providing a quote for Ticket #${args.ticketId}.</p>
                <p>We appreciate your time and effort. While we've selected another vendor for this particular job, we'll keep your information on file for future opportunities.</p>
                <p>Thank you for being part of the Servio network.</p>
                <p>Best regards,<br>Servio Team</p>
              `,
            })
          } catch (error) {
            console.error(
              `Error sending rejection email to ${otherVendor.email}:`,
              error,
            )
          }
        }
      }
    }

    // Send confirmation email to selected vendor
    if (vendor.emailStatus !== 'doNotEmail') {
      try {
        await resend.sendEmail(ctx, {
          from:
            process.env.RESEND_FROM_EMAIL ||
            'Servio Notifications <notifications@updates.shamp.io>',
          to: vendor.email,
          replyTo: [
            process.env.RESEND_REPLY_TO_EMAIL || 'replies@updates.shamp.io',
          ],
          subject: `[Ticket #${args.ticketId}] Your quote has been selected`,
          html: `
            <p>Dear ${vendor.businessName},</p>
            <p>Congratulations! Your quote for Ticket #${args.ticketId} has been selected.</p>
            <p>We'll be in touch shortly to schedule the work.</p>
            <p>Thank you for being part of the Servio network.</p>
            <p>Best regards,<br>Servio Team</p>
          `,
        })
      } catch (error) {
        console.error(`Error sending confirmation email to ${vendor.email}:`, error)
      }
    }

    // Update ticket with all fields atomically
    await ctx.runMutation(internal.tickets.updateInternal as any, {
      ticketId: args.ticketId,
      selectedVendorId: quote.vendorId,
      selectedVendorQuoteId: args.quoteId,
      quoteStatus: 'vendor_selected',
      status: 'Vendor Selected',
    })

    return {
      success: true,
      vendorId: quote.vendorId,
      quoteId: args.quoteId,
    }
  },
})

