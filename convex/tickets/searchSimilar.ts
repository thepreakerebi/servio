import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

export const searchSimilar = action({
  args: {
    ticketId: v.id('tickets'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const user = await ctx.runQuery(internal.users.getCurrent, {})
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket embedding using internal query (auth context preserved from action)
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: args.ticketId,
    })

    if (!ticket || !ticket.embedding) {
      throw new Error('Ticket not found or has no embedding')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access this ticket')
    }

    // Perform vector search
    const results = await ctx.vectorSearch('tickets', 'by_embedding', {
      vector: ticket.embedding,
      limit: args.limit ?? 10,
    })

    // Filter out the current ticket and only return user's tickets
    const filteredResults = results.filter(
      (result) => result._id !== args.ticketId,
    )

    // Load ticket details using internal query
    const tickets = await Promise.all(
      filteredResults.map((result) =>
        ctx.runQuery(internal.tickets.getByIdInternal, {
          ticketId: result._id,
        }),
      ),
    )

    // Filter to only return tickets owned by the user
    return tickets.filter(
      (t: (typeof tickets)[number]): t is NonNullable<typeof t> =>
        t !== null && t.createdBy === user._id,
    )
  },
})

