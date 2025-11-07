'use node'

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { getVendorResponsePrompt } from '../prompts/vendorResponse'
import type { Doc } from '../_generated/dataModel'

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
  handler: async (
    ctx,
    args,
  ): Promise<{
    hasQuote: boolean
    price?: number
    currency: string
    estimatedDeliveryTime?: number
    ratings?: number
    notes?: string
    isDeclining: boolean  
    declineReason?: string
  }> => {
    // Get ticket and vendor data
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const vendor: Doc<'vendors'> | null = await ctx.runQuery(
      internal.vendors.getByIdInternal as any,
      {
        vendorId: args.vendorId,
      },
    )

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Use AI to parse the vendor response and extract quote details
    // The agent understands Servio's purpose and can handle various response formats
    const { object: quoteData } = await generateObject({
      model: openai('gpt-4o'),
      schema: z
        .object({
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
        })
        .refine(
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
      prompt: getVendorResponsePrompt({
        ticketDescription: ticket.description,
        issueType: ticket.issueType,
        location: ticket.location,
        vendorBusinessName: vendor.businessName,
        emailSubject: args.emailSubject,
        emailBody: args.emailBody,
      }),
    })

    return quoteData
  },
})
