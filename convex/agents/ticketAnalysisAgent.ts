'use node'

import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { createAnalyzeImageTool } from './tools/analyzeImage'
import { createClassifyIssueTool } from './tools/classifyIssue'
import { createUpdateTicketTool } from './tools/updateTicket'

export const analyzeTicket = action({
  args: {
    ticketId: v.id('tickets'),
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
      throw new Error('Not authorized to analyze this ticket')
    }

    // Get photo URL
    let imageUrl: string | null = null
    if (ticket.photoId) {
      imageUrl = await ctx.storage.getUrl(ticket.photoId)
    }

    // Create tools
    const analyzeImage = createAnalyzeImageTool(ctx)
    const classifyIssue = createClassifyIssueTool()
    const updateTicket = createUpdateTicketTool(ctx)

    // Create agent
    const agent = new Agent({
      model: openai('gpt-4o'),
      system: `You are an expert maintenance issue classifier. Analyze images and descriptions to classify equipment issues, generate relevant tags, and predict urgency.`,
      tools: {
        analyzeImage,
        classifyIssue,
        updateTicket,
      },
      stopWhen: stepCountIs(5),
    })

    // Generate analysis
    const prompt = `Analyze this maintenance ticket:
    
Description: ${ticket.description}
Location: ${ticket.location}
${imageUrl ? `Image: ${imageUrl}` : 'No image provided'}

Steps:
1. Analyze the image (if available) to identify equipment type and visual problems
2. Classify the issue from the description text
3. Combine both analyses to generate comprehensive tags and issue type
4. Update the ticket with your findings`

    const result = await agent.generate({ prompt })

    // Trigger embedding generation after analysis
    await ctx.scheduler.runAfter(
      0,
      internal.embeddings.generateTicketEmbedding,
      {
        ticketId: args.ticketId,
      },
    )

    return {
      text: result.text,
      steps: result.steps,
    }
  },
})

