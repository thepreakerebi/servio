import { v } from 'convex/values'
import OpenAI from 'openai'
import { internalAction } from '../_generated/server'
import { internal } from '../_generated/api'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate embedding for vendor outreach record
 * Embeds ticket context and vendor info to enable similarity search
 */
export const generateVendorOutreachEmbedding = internalAction({
  args: {
    outreachId: v.id('vendorOutreach'),
  },
  handler: async (ctx, args) => {
    // Get outreach data
    const outreach = await ctx.runQuery(internal.vendorOutreach.getByIdInternal, {
      outreachId: args.outreachId,
    })

    if (!outreach) {
      throw new Error('Vendor outreach not found')
    }

    // Get ticket data
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: outreach.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Get vendor data
    const vendor = await ctx.runQuery(internal.vendors.getByIdInternal, {
      vendorId: outreach.vendorId,
    })

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Create embedding text from ticket and vendor context
    const embeddingText = [
      ticket.description,
      ticket.issueType,
      ...ticket.predictedTags,
      ticket.location,
      vendor.businessName,
      vendor.specialty,
      vendor.address,
    ]
      .filter(Boolean)
      .join(' ')

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText,
    })

    const embedding = response.data[0].embedding

    // Update outreach with embedding
    await ctx.runMutation(internal.embeddings.updateVendorOutreachEmbedding, {
      outreachId: args.outreachId,
      embedding,
    })

    return embedding
  },
})

