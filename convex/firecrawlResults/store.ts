import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const store = mutation({
  args: {
    ticketId: v.id('tickets'),
    results: v.array(
      v.object({
        businessName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        specialty: v.string(),
        address: v.string(),
        rating: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Note: This is typically called by internal agents, but we add auth check for safety
    // In production, consider making this internalMutation if only called internally
    const user = await requireAuth(ctx)
    
    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to store firecrawl results for this ticket')
    }

    const resultId = await ctx.db.insert('firecrawlResults', {
      ticketId: args.ticketId,
      results: args.results,
      createdAt: Date.now(),
    })

    return resultId
  },
})

