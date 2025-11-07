'use node'

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

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

    // Get user data
    const user = await ctx.runQuery(internal.users.getById, {
      userId: ticket.createdBy,
    })

    // Check if vendor has already provided a quote
    const existingQuotes = await ctx.runQuery(
      internal.vendorQuotes.getByTicketIdInternal,
      {
        ticketId: args.ticketId,
      },
    )

    const vendorQuote = existingQuotes.find(
      (q: (typeof existingQuotes)[number]) => q.vendorId === args.vendorId,
    )

    // Build conversation context
    const conversationContext = args.conversationHistory
      .map((msg) => {
        const senderLabel =
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
      prompt: `You are an AI assistant for Servio, a hospitality maintenance platform that connects service providers with maintenance needs.

You are responding to a vendor who has been contacted about a maintenance ticket. Your role is to:
- Answer questions naturally and helpfully
- Provide clarifications when vendors need more information
- Guide vendors to provide complete quotes (price, delivery time, ratings)
- Maintain a professional, friendly tone
- Understand the context of Servio's purpose

Ticket Context:
- Issue: ${ticket.description}
- Issue Type: ${ticket.issueType || 'Unknown'}
- Location: ${ticket.location || 'Not specified'}
- Tags: ${ticket.predictedTags.join(', ')}

Vendor: ${vendor.businessName}
Vendor Email: ${args.vendorEmail}

Conversation History:
${conversationContext || 'No previous conversation'}

Vendor's Latest Message:
${args.vendorMessage}

${vendorQuote ? `Note: This vendor has already provided a quote (Price: ${vendorQuote.price} ${vendorQuote.currency}, Delivery Time: ${vendorQuote.estimatedDeliveryTime} hours)` : 'Note: This vendor has not yet provided a quote'}

Determine:
1. Should you respond? (Respond if vendor is asking questions, needs clarification, or provided incomplete quote. Don't respond if quote is complete and clear, or vendor is clearly declining.)
2. What is the vendor's intent?
3. Generate a natural, contextual response that:
   - Answers their questions if they have any
   - Provides additional context if needed
   - Politely requests missing information if quote is incomplete
   - Thanks them if quote is complete
   - Is professional but friendly
   - Maintains conversation flow

Remember: You represent Servio, a platform that helps hospitality businesses find maintenance service providers. Be helpful, clear, and professional.`,
    })

    return responseData
  },
})

