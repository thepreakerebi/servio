'use node'

import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'
import {
  VENDOR_DISCOVERY_SYSTEM_PROMPT,
  getVendorDiscoveryPrompt,
} from '../prompts/vendorDiscovery'
import { createSearchVendorsTool } from './tools/searchVendors'
import { createUpdateTicketTool } from './tools/updateTicket'
import type { Doc, Id } from '../_generated/dataModel'

// Shared vendor result type for consistent shape across database and web search results
type VendorResult = {
  businessName: string
  email?: string
  phone?: string
  specialty: string
  address: string
  rating?: number
  vendorId?: string // Only present for existing database vendors
  url?: string // Only present for web search results
  description?: string
  position?: number
  services?: Array<string>
}

export const discoverVendors = action({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args): Promise<{
    vendors: Array<VendorResult>
    source: 'database' | 'web_search'
    text: string
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
      throw new Error('Not authorized to discover vendors for this ticket')
    }

    // Get user location - prioritize user's location from users table
    const userData: Doc<'users'> | null = await ctx.runQuery(
      api.users.getById as any,
      {
        userId: ticket.createdBy,
      },
    )

    if (!userData?.location) {
      throw new Error('User location is required. Please update your profile with a location.')
    }

    const location: string = userData.location

    // First, check if there are existing vendors in the database that match
    // Wrap in try-catch to handle errors gracefully and fall back to web search
    let existingVendors: Array<Doc<'vendors'>> = []
    try {
      existingVendors = await ctx.runAction(
        internal.vendors.searchExisting as any,
        {
          ticketId: args.ticketId,
          limit: 5,
        },
      )
    } catch (error) {
      // Log error but continue with web search fallback
      console.error(
        `Error searching existing vendors for ticket ${args.ticketId}:`,
        error,
      )
      existingVendors = []
    }

    // If we found existing vendors, return them without searching
    if (existingVendors.length > 0) {
      // Convert to consistent VendorResult format
      const vendorResults: Array<VendorResult> = existingVendors.map(
        (vendor: Doc<'vendors'>) => ({
          businessName: vendor.businessName,
          email: vendor.email,
          phone: vendor.phone,
          specialty: vendor.specialty,
          address: vendor.address,
          rating: vendor.rating,
          vendorId: vendor._id, // Include vendor ID since it's an existing vendor
          // Explicitly set undefined fields for consistency
          url: undefined,
          description: undefined,
          position: undefined,
          services: undefined,
        }),
      )

      // Store results (even though they're existing vendors, we still want to track the discovery)
      const firecrawlResultsId: Id<'firecrawlResults'> = await ctx.runMutation(
        api.firecrawlResults.store as any,
        {
          ticketId: args.ticketId,
          results: vendorResults,
        },
      )

      await ctx.runMutation(internal.tickets.updateInternal as any, {
        ticketId: args.ticketId,
        firecrawlResultsId,
      })

      // Automatically send outreach emails to discovered vendors
      try {
        await ctx.runAction(api.vendorOutreach.sendOutreachEmails as any, {
          ticketId: args.ticketId,
        })
      } catch (error) {
        console.error('Error sending outreach emails:', error)
        // Continue even if outreach fails
      }

      return {
        vendors: vendorResults,
        source: 'database',
        text: `Found ${existingVendors.length} existing vendor(s) in database matching this ticket.`,
      }
    }

    // No existing vendors found, proceed with web search
    // Create tools
    const searchVendors = createSearchVendorsTool()
    const updateTicket = createUpdateTicketTool(ctx)

    // Create agent
    const agent = new Agent({
      model: openai('gpt-4o'),
      system: VENDOR_DISCOVERY_SYSTEM_PROMPT,
      tools: {
        searchVendors,
        updateTicket,
      },
      stopWhen: stepCountIs(10),
    })

    // Generate vendor discovery
    const prompt = getVendorDiscoveryPrompt({
      issueType: ticket.issueType,
      tags: ticket.predictedTags,
      location,
    })

    const result = await agent.generate({ prompt })

    // Store firecrawl results
    // Note: The agent should call searchVendors which returns vendors
    // We'll extract vendors from the agent's tool calls
    const vendorResults: Array<VendorResult> = extractVendorsFromSteps(result.steps)

    if (vendorResults.length > 0) {
      const firecrawlResultsId: Id<'firecrawlResults'> = await ctx.runMutation(
        api.firecrawlResults.store as any,
        {
          ticketId: args.ticketId,
          results: vendorResults,
        },
      )

      await ctx.runMutation(internal.tickets.updateInternal as any, {
        ticketId: args.ticketId,
        firecrawlResultsId,
      })
    }

    // Automatically send outreach emails to discovered vendors
    try {
      await ctx.runAction(api.vendorOutreach.sendOutreachEmails as any, {
        ticketId: args.ticketId,
      })
    } catch (error) {
      console.error('Error sending outreach emails:', error)
      // Continue even if outreach fails
    }

    return {
      vendors: vendorResults,
      source: 'web_search',
      text: result.text,
    }
  },
})

function extractVendorsFromSteps(steps: Array<any>): Array<VendorResult> {
  const vendors: Array<VendorResult> = []
  for (const step of steps) {
    if (step.toolResults) {
      for (const toolResult of step.toolResults) {
        if (
          toolResult.toolName === 'searchVendors' &&
          toolResult.result?.vendors
        ) {
          // Map web search vendors to VendorResult format
          const webVendors: Array<VendorResult> = toolResult.result.vendors.map(
            (vendor: any) => ({
              businessName: vendor.businessName || 'Unknown',
              email: vendor.email,
              phone: vendor.phone,
              specialty: vendor.specialty || 'General',
              address: vendor.address || '',
              rating: vendor.rating,
              url: vendor.url,
              description: vendor.description,
              position: vendor.position,
              services: vendor.services,
              // vendorId is undefined for web search results
              vendorId: undefined,
            }),
          )
          vendors.push(...webVendors)
        }
      }
    }
  }
  return vendors
}
