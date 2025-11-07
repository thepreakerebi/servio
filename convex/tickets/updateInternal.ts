import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Internal mutation to update ticket fields (used by actions)
 */
export const updateInternal = internalMutation({
  args: {
    ticketId: v.id('tickets'),
    issueType: v.optional(v.string()),
    predictedTags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    firecrawlResultsId: v.optional(v.id('firecrawlResults')),
    selectedVendorId: v.optional(v.id('vendors')),
    selectedVendorQuoteId: v.optional(v.id('vendorQuotes')),
    quoteStatus: v.optional(
      v.union(
        v.literal('awaiting_quotes'),
        v.literal('quotes_received'),
        v.literal('vendor_selected'),
        v.literal('scheduling'),
      ),
    ),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ticketId, ...updates } = args
    await ctx.db.patch(ticketId, updates)
  },
})

