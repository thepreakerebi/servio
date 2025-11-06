import { Resend } from '@convex-dev/resend'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { components, internal } from '../_generated/api'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
})

export const forwardToUser = action({
  args: {
    ticketId: v.id('tickets'),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Get ticket and user data using internal query
    // Note: This is called from webhook handler, auth may not be available
    // We verify ownership through ticket.createdBy instead
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: args.ticketId,
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const user = await ctx.runQuery(internal.users.getById, {
      userId: ticket.createdBy,
    })

    if (!user || !user.email) {
      throw new Error('User not found or has no email')
    }

    // Send notification email to user
    await resend.sendEmail(ctx, {
      from:
        process.env.RESEND_FROM_EMAIL ||
        'Servio Notifications <notifications@updates.shamp.io>',
      to: user.email,
      subject: `Update on Ticket #${args.ticketId}`,
      html: `
        <p>You have received a reply on your maintenance ticket.</p>
        <p><strong>Ticket:</strong> ${ticket.description}</p>
        <p><strong>Reply:</strong></p>
        <p>${args.message}</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/tickets/${args.ticketId}">View ticket in dashboard</a></p>
      `,
    })
  },
})

