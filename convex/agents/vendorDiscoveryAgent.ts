'use node'

import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { createSearchVendorsTool } from './tools/searchVendors'
import { createUpdateTicketTool } from './tools/updateTicket'

export const discoverVendors = action({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const user = await ctx.runQuery(internal.users.getCurrent, {})
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket data
    const ticket = await ctx.runQuery(internal.tickets.getById, {
      ticketId: args.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to discover vendors for this ticket')
    }

    // Get user location
    const userData = await ctx.runQuery(internal.users.getById, {
      userId: ticket.createdBy,
    })

    const location = userData?.location || ticket.location

    // Create tools
    const searchVendors = createSearchVendorsTool(ctx)
    const updateTicket = createUpdateTicketTool(ctx)

    // Create agent
    const agent = new Agent({
      model: openai('gpt-4o'),
      system: `You are an expert at finding local service providers. Search for vendors that match the issue type and location, filter by relevance, and store results.`,
      tools: {
        searchVendors,
        updateTicket,
      },
      stopWhen: stepCountIs(10),
    })

    // Generate vendor discovery
    const prompt = `Find local vendors for this maintenance ticket:
    
Issue Type: ${ticket.issueType || 'Unknown'}
Tags: ${ticket.predictedTags.join(', ')}
Location: ${location}

Steps:
1. Search for vendors matching the issue type and location
2. Evaluate results and filter by relevance
3. Refine search if needed to find better matches
4. Store the best vendor candidates`

    const result = await agent.generate({ prompt })

    // Store firecrawl results
    // Note: The agent should call searchVendors which returns vendors
    // We'll extract vendors from the agent's tool calls
    const vendorResults = extractVendorsFromSteps(result.steps)

    if (vendorResults.length > 0) {
      const firecrawlResultsId = await ctx.runMutation(
        internal.firecrawlResults.store,
        {
          ticketId: args.ticketId,
          results: vendorResults,
        },
      )

      await ctx.runMutation(internal.tickets.update, {
        ticketId: args.ticketId,
        firecrawlResultsId,
      })
    }

    return {
      vendors: vendorResults,
      text: result.text,
    }
  },
})

function extractVendorsFromSteps(steps: any[]): any[] {
  const vendors: any[] = []
  for (const step of steps) {
    if (step.toolResults) {
      for (const toolResult of step.toolResults) {
        if (
          toolResult.toolName === 'searchVendors' &&
          toolResult.result?.vendors
        ) {
          vendors.push(...toolResult.result.vendors)
        }
      }
    }
  }
  return vendors
}

