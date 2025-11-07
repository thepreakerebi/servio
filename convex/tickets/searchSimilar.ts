import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'

export const searchSimilar = action({
  args: {
    ticketId: v.id('tickets'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<Doc<'tickets'>>> => {
    // Require authentication
    const user = await ctx.runQuery(api.users.getCurrent as any, {})
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket embedding using internal query (auth context preserved from action)
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (!ticket || !ticket.embedding) {
      throw new Error('Ticket not found or has no embedding')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access this ticket')
    }

    // Perform vector search
    const results: Array<{ _id: Id<'tickets'>; _score: number }> =
      await ctx.vectorSearch('tickets', 'by_embedding', {
        vector: ticket.embedding,
        limit: args.limit ?? 10,
      })

    // Filter out the current ticket and only return user's tickets
    const filteredResults = results.filter(
      (result: { _id: Id<'tickets'>; _score: number }) =>
        result._id !== args.ticketId,
    )

    // Load ticket details using internal query
    const tickets: Array<Doc<'tickets'> | null> = await Promise.all(
      filteredResults.map(
        async (result: { _id: Id<'tickets'>; _score: number }) =>
          await ctx.runQuery(internal.tickets.getByIdInternal as any, {
            ticketId: result._id,
          }),
      ),
    )

    // Filter to only return tickets owned by the user
    return tickets.filter(
      (t: Doc<'tickets'> | null): t is Doc<'tickets'> =>
        t !== null && t.createdBy === user._id,
    )
  },
})

