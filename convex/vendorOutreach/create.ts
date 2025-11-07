import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Create a vendor outreach record when an email is sent to a vendor
 * Returns the outreach ID for embedding generation scheduling
 */
export const create = internalMutation({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    emailId: v.string(),
    expiresAt: v.number(), // Quote request expiration timestamp
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const outreachId = await ctx.db.insert('vendorOutreach', {
      ticketId: args.ticketId,
      vendorId: args.vendorId,
      emailId: args.emailId,
      emailSentAt: now,
      status: 'sent',
      expiresAt: args.expiresAt,
    })

    return outreachId
  },
})

