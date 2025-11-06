'use node'

import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { createDraftEmailTool } from './tools/draftEmail'
import { createUpdateTicketTool } from './tools/updateTicket'

export const draftVendorEmail = action({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const user = await ctx.runQuery(internal.users.getCurrent, {})
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket data using internal query (auth context preserved from action)
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: args.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to draft email for this ticket')
    }

    // Get vendor data using internal query (auth context preserved from action)
    const vendor = await ctx.runQuery(internal.vendors.getByIdInternal, {
      vendorId: args.vendorId,
    })

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Get photo URL
    let imageUrl: string | null = null
    if (ticket.photoId) {
      imageUrl = await ctx.storage.getUrl(ticket.photoId)
    }

    // Create tools
    const draftEmail = createDraftEmailTool()
    const updateTicket = createUpdateTicketTool(ctx)

    // Create agent
    const agent = new Agent({
      model: openai('gpt-4o'),
      system: `You are a professional hospitality maintenance coordinator. Draft clear, professional emails to vendors requesting maintenance services.`,
      tools: {
        draftEmail,
        updateTicket,
      },
      stopWhen: stepCountIs(3),
    })

    // Generate email draft
    const prompt = `Draft an email to a vendor for this maintenance ticket:

Ticket Details: ${ticket.description}
Issue Type: ${ticket.issueType || 'Unknown'}
Location: ${ticket.location}
Tags: ${ticket.predictedTags.join(', ')}
${imageUrl ? `Image: ${imageUrl}` : ''}

Vendor: ${vendor.businessName}
${vendor.email ? `Email: ${vendor.email}` : ''}

Steps:
1. Gather all ticket context
2. Draft a professional email with subject and body
3. Review and refine the email
4. Return the final email content`

    const result = await agent.generate({ prompt })

    // Extract email from agent's tool calls
    const emailContent = extractEmailFromSteps(result.steps)

    return {
      ...emailContent,
      agentText: result.text,
    }
  },
})

function extractEmailFromSteps(steps: Array<any>): { subject: string; body: string } {
  for (const step of steps) {
    if (step.toolResults) {
      for (const toolResult of step.toolResults) {
        if (toolResult.toolName === 'draftEmail' && toolResult.result) {
          return {
            subject: toolResult.result.subject || '',
            body: toolResult.result.body || '',
          }
        }
      }
    }
  }
  return { subject: '', body: '' }
}

