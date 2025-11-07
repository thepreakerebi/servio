import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Create a vendor quote from a vendor response
 */
export const create = internalMutation({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    vendorOutreachId: v.id('vendorOutreach'),
    price: v.number(),
    currency: v.string(),
    estimatedDeliveryTime: v.number(),
    ratings: v.optional(v.number()),
    responseText: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const quoteId = await ctx.db.insert('vendorQuotes', {
      ticketId: args.ticketId,
      vendorId: args.vendorId,
      vendorOutreachId: args.vendorOutreachId,
      price: args.price,
      currency: args.currency,
      estimatedDeliveryTime: args.estimatedDeliveryTime,
      ratings: args.ratings,
      responseText: args.responseText,
      status: 'received',
      responseReceivedAt: now,
      createdAt: now,
    })

    return quoteId
  },
})

