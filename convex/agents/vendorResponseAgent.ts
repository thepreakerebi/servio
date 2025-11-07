'use node'

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

/**
 * Parse vendor email response to extract quote details
 * This agent understands the context of Servio and can respond naturally to vendor emails
 */
export const parseVendorResponse = action({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    vendorOutreachId: v.id('vendorOutreach'),
    emailBody: v.string(),
    emailSubject: v.string(),
  },
  handler: async (ctx, args) => {
    // Get ticket and vendor data
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: args.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const vendor = await ctx.runQuery(internal.vendors.getByIdInternal, {
      vendorId: args.vendorId,
    })

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Use AI to parse the vendor response and extract quote details
    // The agent understands Servio's purpose and can handle various response formats
    const { object: quoteData } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        hasQuote: z.boolean().describe('Whether the vendor provided a quote'),
        price: z
          .number()
          .optional()
          .describe('Price in smallest currency unit (cents for USD)'),
        currency: z
          .string()
          .default('USD')
          .describe('Currency code (USD, EUR, etc.), defaults to USD'),
        estimatedDeliveryTime: z
          .number()
          .optional()
          .describe('Estimated delivery/completion time in hours'),
        ratings: z
          .number()
          .optional()
          .describe('Ratings/reviews score if provided (0-5 scale)'),
        notes: z
          .string()
          .optional()
          .describe('Additional notes or conditions from vendor'),
        isDeclining: z
          .boolean()
          .describe('Whether the vendor is declining the work'),
        declineReason: z
          .string()
          .optional()
          .describe('Reason for declining if applicable'),
      }).refine(
        (data) => {
          // If vendor provided a quote and is not declining, require price and estimatedDeliveryTime
          // Note: currency always has a default value of 'USD', so it's always defined
          if (data.hasQuote && !data.isDeclining) {
            return (
              data.price !== undefined &&
              data.estimatedDeliveryTime !== undefined
            )
          }
          return true
        },
        {
          message:
            'Complete quote must include price and estimatedDeliveryTime',
        },
      ),
      prompt: `You are an AI assistant for Servio, a hospitality maintenance platform that connects service providers with maintenance needs.

A vendor has responded to a quote request email. Parse their response and extract relevant information.

Ticket Context:
- Issue: ${ticket.description}
- Issue Type: ${ticket.issueType || 'Unknown'}
- Location: ${ticket.location || 'Not specified'}

Vendor: ${vendor.businessName}
Email Subject: ${args.emailSubject}
Email Body: ${args.emailBody}

Extract the following information from the vendor's response:
1. **Price**: Look for any mention of price, cost, quote, estimate, fee, charge, etc. Convert to smallest currency unit (e.g., $500 = 50000 cents for USD)
2. **Currency**: Identify the currency (USD, EUR, GBP, etc.). Default to USD if not specified.
3. **Delivery Time**: Look for completion time, delivery time, estimated time, etc. Convert to hours (e.g., "2 days" = 48 hours, "1 week" = 168 hours)
4. **Ratings**: If the vendor mentions ratings, reviews, or satisfaction scores, extract them (0-5 scale)
5. **Notes**: Any additional information, conditions, or requirements
6. **Declining**: Determine if the vendor is declining the work or unable to take it on

The vendor may respond in various formats:
- Formal quote with structured pricing
- Casual response with pricing mentioned
- Questions about the work
- Decline due to unavailability or other reasons
- Partial information (e.g., only price, only time)

Be intelligent about parsing - vendors may not always provide all requested information, but try to extract what's available.`,
    })

    return quoteData
  },
})

