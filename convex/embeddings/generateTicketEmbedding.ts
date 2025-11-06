import { v } from 'convex/values'
import OpenAI from 'openai'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const generateTicketEmbedding = action({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    // Get ticket data
    const ticket = await ctx.runQuery(internal.tickets.getById, {
      ticketId: args.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Create embedding text from ticket fields
    const embeddingText = [
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

    const embedding = response.data[0].embedding

    // Update ticket with embedding
    await ctx.runMutation(internal.embeddings.updateTicketEmbedding, {
      ticketId: args.ticketId,
      embedding,
    })

    return embedding
  },
})

