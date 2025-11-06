import { v } from 'convex/values'
import OpenAI from 'openai'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const generateVendorEmbedding = action({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    // Get vendor data
    const vendor = await ctx.runQuery(internal.vendors.getById, {
      vendorId: args.vendorId,
    })

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Create embedding text from vendor fields
    const embeddingText = [
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

    // Update vendor with embedding
    await ctx.runMutation(internal.embeddings.updateVendorEmbedding, {
      vendorId: args.vendorId,
      embedding,
    })

    return embedding
  },
})

