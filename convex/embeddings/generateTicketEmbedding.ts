import { v } from 'convex/values'
import OpenAI from 'openai'
import { internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Internal action - called from schedulers, no user context
export const generateTicketEmbedding = internalAction({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args): Promise<Array<number>> => {
    // Get ticket data using internal query (no auth required)
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Create embedding text from ticket fields
    const embeddingText: string = [
      ticket.description,
      ticket.issueType,
      ...ticket.predictedTags,
      ticket.location,
    ]
      .filter(Boolean)
      .join(' ')

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText,
    })

    const embedding: Array<number> = response.data[0].embedding

    // Update ticket with embedding
    await ctx.runMutation(internal.embeddings.updateTicketEmbedding as any, {
      ticketId: args.ticketId,
      embedding,
    })

    return embedding
  },
})

