import { v } from 'convex/values'
import { query } from '../_generated/server'

/**
 * Get vendor quotes for a ticket, sorted by score (recommendations)
 */
export const getRecommendations = query({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    // Get all received quotes for this ticket
    const quotes = await ctx.db
      .query('vendorQuotes')
      .withIndex('by_ticketId_status', (q) =>
        q.eq('ticketId', args.ticketId).eq('status', 'received'),
      )
      .collect()

    // Fetch vendor details and sort by score (highest first)
    const quotesWithVendors = await Promise.all(
      quotes.map(async (quote) => {
        const vendor = await ctx.db.get(quote.vendorId)
        return {
          ...quote,
          vendor,
        }
      }),
    )

    // Filter out quotes with deleted vendors
    const validQuotes = quotesWithVendors.filter(
      (q): q is typeof q & { vendor: NonNullable<typeof q.vendor> } =>
        q.vendor !== null,
    )

    // Sort by score (highest first), then by price (lowest first) if no score
    validQuotes.sort((a, b) => {
      if (a.score !== undefined && b.score !== undefined) {
        return b.score - a.score
      }
      if (a.score !== undefined) return -1
      if (b.score !== undefined) return 1
      return a.price - b.price
    })

    return validQuotes
  },
})

