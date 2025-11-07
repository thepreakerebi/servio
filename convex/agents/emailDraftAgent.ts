'use node'

import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import {  
  EMAIL_DRAFT_SYSTEM_PROMPT, 
  getEmailDraftPrompt,
} from '../prompts/emailDraft'  
import { api, internal } from '../_generated/api'
import { createDraftEmailTool } from './tools/draftEmail'
import { createUpdateTicketTool } from './tools/updateTicket'

import type { Doc } from '../_generated/dataModel'

export const draftVendorEmail = action({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    subject: string
    body: string
    agentText: string
  }> => {
    // Require authentication
    const user: Doc<'users'> | null = await ctx.runQuery(
      api.users.getCurrent as any,
      {},
    )
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket data using internal query (auth context preserved from action)
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to draft email for this ticket')
    }

    // Get vendor data using internal query (auth context preserved from action)
    const vendor: Doc<'vendors'> | null = await ctx.runQuery(
      internal.vendors.getByIdInternal as any,
      {
        vendorId: args.vendorId,
      },
    )

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
      system: EMAIL_DRAFT_SYSTEM_PROMPT,
      tools: {
        draftEmail,
        updateTicket,
      },
      stopWhen: stepCountIs(3),
    })

    // Generate email draft
    const prompt = getEmailDraftPrompt({
      description: ticket.description,
      issueType: ticket.issueType,
      location: ticket.location,
      tags: ticket.predictedTags,
      imageUrl,
      vendorBusinessName: vendor.businessName,
      vendorEmail: vendor.email,
    })

    const result = await agent.generate({ prompt })

    // Extract email from agent's tool calls
    const emailContent = extractEmailFromSteps(result.steps)

    return {
      ...emailContent,
      agentText: result.text,
    }
  },
})

function extractEmailFromSteps(steps: Array<any>): {
  subject: string
  body: string
} {
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
