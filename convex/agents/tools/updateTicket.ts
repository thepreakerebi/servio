'use node'

import { z } from 'zod'
import { tool } from 'ai'
import { internal } from '../../_generated/api'
import type { ActionCtx } from '../../_generated/server'

const updateTicketSchema = z.object({
  ticketId: z.string().describe('Ticket ID to update'),
  issueType: z.string().optional().describe('Issue type'),
  predictedTags: z.array(z.string()).optional().describe('Predicted tags'),
  status: z.string().optional().describe('Ticket status'),
})

type UpdateTicketParams = z.infer<typeof updateTicketSchema>

export function createUpdateTicketTool(ctx: ActionCtx) {
  return tool({
    description: 'Update ticket fields in the database',
    parameters: updateTicketSchema,
    execute: async ({
      ticketId,
      issueType,
      predictedTags,
      status,
    }: UpdateTicketParams) => {
      await ctx.runMutation(internal.tickets.update, {
        ticketId: ticketId as any,
        issueType,
        predictedTags,
      })

      if (status) {
        await ctx.runMutation(internal.tickets.updateStatus, {
          ticketId: ticketId as any,
          status,
        })
      }

      const updated = await ctx.runQuery(internal.tickets.getById, {
        ticketId: ticketId as any,
      })

      return { ticket: updated }
    },
  } as any)
}

