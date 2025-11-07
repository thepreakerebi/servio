import { Resend } from '@convex-dev/resend'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, components, internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent as any,
})

export const sendVendorEmail = action({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args): Promise<{
    emailId: string
    threadId: string
  }> => {
    // Require authentication
    const user: Doc<'users'> | null = await ctx.runQuery(
      api.users.getCurrent as any,
      {},
    )
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Draft email using agent
    const emailContent = await ctx.runAction(
      api.agents.emailDraftAgent.draftVendorEmail as any,
      {
        ticketId: args.ticketId,
        vendorId: args.vendorId,
      },
    )

    // Get ticket and vendor data using internal queries (auth context preserved)
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )
    const vendor: Doc<'vendors'> | null = await ctx.runQuery(
      internal.vendors.getByIdInternal as any,
      {
        vendorId: args.vendorId,
      },
    )

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
      from:
        process.env.RESEND_FROM_EMAIL ||
        'Servio Notifications <notifications@updates.shamp.io>',
      to: vendor.email,
      replyTo: [
        process.env.RESEND_REPLY_TO_EMAIL || 'replies@updates.shamp.io',
      ],
      subject: `[Ticket #${args.ticketId}] ${emailContent.subject}`,
      html:
        emailContent.body +
        (photoUrl ? `<br><img src="${photoUrl}" alt="Issue photo">` : ''),
    })

    // Store email-to-ticket mapping for tracking email events
    await ctx.runMutation(internal.emails.storeEmailMapping as any, {
      emailId: emailId as string,
      ticketId: args.ticketId,
      vendorId: args.vendorId,
    })

    // Create or update conversation
    let conversationId = ticket.conversationId
    if (!conversationId) {
      conversationId = await ctx.runMutation(
        api.conversations.create as any,
        {
          ticketId: args.ticketId,
        },
      )
    }

    // Add initial message to conversation
    await ctx.runMutation(api.conversations.addMessage as any, {
      conversationId,
      sender: 'agent',
      message: emailContent.body,
    })

    // Update ticket status
    await ctx.runMutation(api.tickets.updateStatus as any, {
      ticketId: args.ticketId,
      status: 'Sent',
    })

    return { emailId, threadId }
  },
})

