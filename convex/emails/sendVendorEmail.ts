import { Resend } from '@convex-dev/resend'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { components, internal } from '../_generated/api'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent,
})

export const sendVendorEmail = action({
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

    // Draft email using agent
    const emailContent = await ctx.runAction(
      internal.agents.emailDraftAgent.draftVendorEmail,
      {
        ticketId: args.ticketId,
        vendorId: args.vendorId,
      },
    )

    // Get ticket and vendor data
    const ticket = await ctx.runQuery(internal.tickets.getById, {
      ticketId: args.ticketId,
    })
    const vendor = await ctx.runQuery(internal.vendors.getById, {
      vendorId: args.vendorId,
    })

    if (!ticket || !vendor) {
      throw new Error('Ticket or vendor not found')
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to send email for this ticket')
    }

    // Generate unique thread ID
    const threadId = `ticket-${args.ticketId}-${Date.now()}`

    // Get photo URL if available
    let photoUrl: string | undefined
    if (ticket.photoId) {
      photoUrl = await ctx.storage.getUrl(ticket.photoId) ?? undefined
    }

    // Send email via Resend
    const emailId = await resend.sendEmail(ctx, {
      from: 'tickets@servio.com',
      to: vendor.email,
      replyTo: ['tickets@servio.com'],
      subject: `[Ticket #${args.ticketId}] ${emailContent.subject}`,
      html:
        emailContent.body +
        (photoUrl ? `<br><img src="${photoUrl}" alt="Issue photo">` : ''),
    })

    // Create or update conversation
    let conversationId = ticket.conversationId
    if (!conversationId) {
      conversationId = await ctx.runMutation(internal.conversations.create, {
        ticketId: args.ticketId,
      })
    }

    // Add initial message to conversation
    await ctx.runMutation(internal.conversations.addMessage, {
      conversationId,
      sender: 'agent',
      message: emailContent.body,
    })

    // Update ticket status
    await ctx.runMutation(internal.tickets.updateStatus, {
      ticketId: args.ticketId,
      status: 'Sent',
    })

    return { emailId, threadId }
  },
})

