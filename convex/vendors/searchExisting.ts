import { v } from 'convex/values'
import { internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Search for existing vendors in the database that match the ticket
 * Uses vector search to find vendors with similar specialties/issues
 * Internal action - called from vendorDiscoveryAgent
 */
export const searchExisting = internalAction({
  args: {
    ticketId: v.id('tickets'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get ticket data
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: args.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Generate embedding for ticket if not exists
    let ticketEmbedding = ticket.embedding
    if (!ticketEmbedding) {
      const embeddingText = [
        ticket.description,
        ticket.issueType,
        ...ticket.predictedTags,
      ]
        .filter(Boolean)
        .join(' ')

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText,
      })

      ticketEmbedding = response.data[0].embedding

      // Update ticket with embedding
      await ctx.runMutation(internal.embeddings.updateTicketEmbedding, {
        ticketId: args.ticketId,
        embedding: ticketEmbedding,
      })
    }

    // Perform vector search for vendors
    // Filter by specialty if available for better matches
    const results = await ctx.vectorSearch('vendors', 'by_embedding', {
      vector: ticketEmbedding,
      limit: args.limit ?? 10,
      filter: ticket.issueType
        ? (q) => q.eq('specialty', ticket.issueType)
        : undefined,
    })

    // Load vendor details
    const vendors = await Promise.all(
      results.map((result) =>
        ctx.runQuery(internal.vendors.getByIdInternal, {
          vendorId: result._id,
        }),
      ),
    )

    return vendors.filter(
      (v): v is NonNullable<typeof v> => v !== null && v.embedding !== undefined,
    )
  },
})

