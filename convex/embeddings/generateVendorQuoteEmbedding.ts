import { v } from 'convex/values'
import OpenAI from 'openai'
import { internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate embedding for vendor quote record
 * Embeds quote details (price, delivery time, response text) to enable similarity search
 */
export const generateVendorQuoteEmbedding = internalAction({
  args: {
    quoteId: v.id('vendorQuotes'),
  },
  handler: async (ctx, args): Promise<Array<number>> => {
    // Get quote data
    const quote: Doc<'vendorQuotes'> | null = await ctx.runQuery(
      internal.vendorQuotes.getByIdInternal as any,
      {
        quoteId: args.quoteId,
      },
    )

    if (!quote) {
      throw new Error('Vendor quote not found')
    }

    // Get ticket data for context
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: quote.ticketId,
      },
    )

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Get vendor data
    const vendor: Doc<'vendors'> | null = await ctx.runQuery(
      internal.vendors.getByIdInternal as any,
      {
        vendorId: quote.vendorId,
      },
    )

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Create embedding text from quote, ticket, and vendor context
    // Format price appropriately (assuming smallest currency unit, e.g., cents for USD)
    // For most currencies, divide by 100, but this is a simplification
    const priceFormatted: string =
      quote.currency === 'USD' || quote.currency === 'EUR' || quote.currency === 'GBP'
        ? `${quote.price / 100} ${quote.currency}`
        : `${quote.price} ${quote.currency}`
    const deliveryTimeFormatted: string = `${quote.estimatedDeliveryTime} hours`
    const ratingText: string = quote.ratings ? `${quote.ratings}/5 rating` : ''

    const embeddingText: string = [
      ticket.description,
      ticket.issueType,
      ...ticket.predictedTags,
      vendor.businessName,
      vendor.specialty,
      `Price: ${priceFormatted}`,
      `Delivery time: ${deliveryTimeFormatted}`,
      ratingText,
      quote.responseText,
    ]
      .filter(Boolean)
      .join(' ')

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText,
    })

    const embedding: Array<number> = response.data[0].embedding

    // Update quote with embedding
    await ctx.runMutation(internal.embeddings.updateVendorQuoteEmbedding as any, {
      quoteId: args.quoteId,
      embedding,
    })

    return embedding
  },
})

