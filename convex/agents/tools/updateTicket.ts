'use node'

import { z } from 'zod'
import { tool } from 'ai'
import { api, internal } from '../../_generated/api'
import type { ActionCtx } from '../../_generated/server'
import type { Doc } from '../../_generated/dataModel'

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
      await ctx.runMutation(api.tickets.update as any, {
        ticketId: ticketId as any,
        issueType,
        predictedTags,
      })

      if (status) {
        await ctx.runMutation(api.tickets.updateStatus as any, {
          ticketId: ticketId as any,
          status,
        })
      }

      const updated: Doc<'tickets'> | null = await ctx.runQuery(
        internal.tickets.getByIdInternal as any,
        {
          ticketId: ticketId as any,
        },
      )

      return { ticket: updated }
    },
  } as any)
}
