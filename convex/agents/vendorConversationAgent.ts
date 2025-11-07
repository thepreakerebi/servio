'use node'

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'
import { getVendorConversationPrompt } from '../prompts/vendorConversation'
import type { Doc } from '../_generated/dataModel'

/**
 * Conversational response agent that responds to vendor emails naturally
 * This agent understands context, handles questions, and maintains conversation flow
 */
export const generateVendorResponse = action({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    vendorEmail: v.string(),
    vendorMessage: v.string(),
    conversationHistory: v.array(
      v.object({
        sender: v.union(
          v.literal('user'),
          v.literal('agent'),
          v.literal('vendor'),
        ),
        message: v.string(),
        date: v.number(),
      }),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    shouldRespond: boolean
    responseSubject?: string
    responseBody?: string
    intent:
      | 'question'
      | 'clarification'
      | 'quote_provided'
      | 'declining'
      | 'follow_up'
      | 'other'
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

    // Get user data
    const user: Doc<'users'> | null = await ctx.runQuery(
      api.users.getById as any,
      {
        userId: ticket.createdBy,
      },
    )

    // Check if vendor has already provided a quote
    const existingQuotes: Array<Doc<'vendorQuotes'>> = await ctx.runQuery(
      internal.vendorQuotes.getByTicketIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    const vendorQuote = existingQuotes.find(
      (q: Doc<'vendorQuotes'>) => q.vendorId === args.vendorId,
    )

    // Build conversation context
    const conversationContext: string = args.conversationHistory
      .map((msg) => {
        const senderLabel: string =
          msg.sender === 'agent'
            ? 'Servio Agent'
            : msg.sender === 'vendor'
              ? vendor.businessName
              : user?.name || 'User'
        return `${senderLabel}: ${msg.message}`
      })
      .join('\n\n')

    // Use AI to generate contextual response
    const { object: responseData } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        shouldRespond: z
          .boolean()
          .describe(
            'Whether the agent should respond to this vendor message (true for questions, clarifications, or when quote is incomplete; false if quote is complete or vendor is declining)',
          ),
        responseSubject: z
          .string()
          .optional()
          .describe('Subject line for the response email'),
        responseBody: z
          .string()
          .optional()
          .describe('Natural, contextual response body'),
        intent: z
          .union([
            z.literal('question'),
            z.literal('clarification'),
            z.literal('quote_provided'),
            z.literal('declining'),
            z.literal('follow_up'),
            z.literal('other'),
          ])
          .describe('Intent of the vendor message'),
      }),
      prompt: getVendorConversationPrompt({
        ticketDescription: ticket.description,
        issueType: ticket.issueType,
        location: ticket.location,
        tags: ticket.predictedTags,
        vendorBusinessName: vendor.businessName,
        vendorEmail: args.vendorEmail,
        conversationHistory: conversationContext,
        vendorMessage: args.vendorMessage,
        vendorQuote: vendorQuote
          ? {
              price: vendorQuote.price,
              currency: vendorQuote.currency,
              estimatedDeliveryTime: vendorQuote.estimatedDeliveryTime,
            }
          : undefined,
      }),
    })

    return responseData
  },
})
