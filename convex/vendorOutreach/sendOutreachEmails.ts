'use node'

import { Resend } from '@convex-dev/resend'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, components, internal } from '../_generated/api'   
import type { Doc, Id } from '../_generated/dataModel'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent as any,
})

/**
 * Send outreach emails to all discovered vendors for a ticket
 * This is called after vendors are discovered to request quotes
 */
export const sendOutreachEmails = action({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args): Promise<{
    sent: number
    failed: number
    results: Array<{
      vendorId: string
      emailId?: string
      error?: string
    }>
  }> => {
    // Require authentication
    const user: Doc<'users'> | null = await ctx.runQuery(
      api.users.getCurrent as any,
      {},
    )
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get ticket data
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
      throw new Error('Not authorized to send outreach emails for this ticket')
    }

    // Get firecrawl results to find discovered vendors
    if (!ticket.firecrawlResultsId) {
      throw new Error('No vendor discovery results found for this ticket')
    }

    const firecrawlResults: Doc<'firecrawlResults'> | null = await ctx.runQuery(
      internal.firecrawlResults.getById as any,
      {
        resultId: ticket.firecrawlResultsId,
      },
    )
    if (!firecrawlResults || firecrawlResults.results.length === 0) {
      throw new Error('No vendors found in discovery results')
    }

    // Get photo URL if available
    let photoUrl: string | undefined
    if (ticket.photoId) {
      photoUrl = await ctx.storage.getUrl(ticket.photoId) ?? undefined
    }

    // Get user location
    const userData: Doc<'users'> | null = await ctx.runQuery(
      api.users.getById as any,
      {
        userId: ticket.createdBy,
      },
    )
    const location: string = userData?.location || ticket.location || 'Not specified'

    // Create or get conversation
    let conversationId: Id<'conversations'> | undefined = ticket.conversationId
    if (!conversationId) {
      conversationId = await ctx.runMutation(api.conversations.create as any, {
        ticketId: args.ticketId,
      })
    }

    // Process each vendor
    const outreachResults: Array<{
      vendorId: string
      emailId?: string
      error?: string
    }> = []

    // Set expiration time (72 hours from now)
    const expiresAt: number = Date.now() + 72 * 60 * 60 * 1000

    for (const vendorResult of firecrawlResults.results) {
      try {
        // Skip vendors without email
        if (!vendorResult.email) {
          outreachResults.push({
            vendorId: vendorResult.vendorId || 'unknown',
            error: 'No email address',
          })
          continue
        }

        // Get or create vendor in database
        let vendorId: Id<'vendors'>
        if (vendorResult.vendorId) {
          vendorId = vendorResult.vendorId as Id<'vendors'>
        } else {
          // Create vendor if doesn't exist
          vendorId = await ctx.runMutation(api.vendors.create as any, {
            businessName: vendorResult.businessName,
            email: vendorResult.email,
            phone: vendorResult.phone,
            specialty: vendorResult.specialty,
            address: vendorResult.address,
            rating: vendorResult.rating,
          })
        }

        // Draft email using agent
        const emailContent = await ctx.runAction(
          api.agents.emailDraftAgent.draftVendorEmail as any,
          {
            ticketId: args.ticketId,
            vendorId,
          },
        )

        // Get vendor data
        const vendor: Doc<'vendors'> | null = await ctx.runQuery(
          internal.vendors.getByIdInternal as any,
          {
            vendorId,
          },
        )

        if (!vendor) {
          outreachResults.push({
            vendorId: vendorId as string,
            error: 'Vendor not found',
          })
          continue
        }

        // Skip if vendor email status is doNotEmail or bounced
        if (
          vendor.emailStatus === 'doNotEmail' ||
          vendor.emailStatus === 'bounced'
        ) {
          outreachResults.push({
            vendorId: vendorId as string,
            error: `Email status: ${vendor.emailStatus}`,
          })
          continue
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

        // Store email mapping
        await ctx.runMutation(internal.emails.storeEmailMapping as any, {
          emailId: emailId as string,
          ticketId: args.ticketId,
          vendorId,
        })

        // Create outreach record
        const outreachId: Id<'vendorOutreach'> = await ctx.runMutation(
          internal.vendorOutreach.create as any,
          {
            ticketId: args.ticketId,
            vendorId,
            emailId: emailId as string,
            expiresAt,
          },
        )

        // Schedule embedding generation for vendor outreach
        await ctx.scheduler.runAfter(
          0,
          internal.embeddings.generateVendorOutreachEmbedding as any,
          {
            outreachId,
          },
        )

        // Add message to conversation
        await ctx.runMutation(api.conversations.addMessage as any, {
          conversationId,
          sender: 'agent',
          message: `Quote request sent to ${vendor.businessName}`,
        })

        outreachResults.push({
          vendorId: vendorId as string,
          emailId: emailId as string,
        })
      } catch (error) {
        console.error(
          `Error sending outreach email to vendor ${vendorResult.businessName}:`,
          error,
        )
        outreachResults.push({
          vendorId: vendorResult.vendorId || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update ticket status and quote status only if at least one email was sent successfully
    const successfulSends: number = outreachResults.filter((r) => r.emailId).length

    if (successfulSends > 0) {
      await ctx.runMutation(api.tickets.updateStatus as any, {
        ticketId: args.ticketId,
        status: 'Awaiting Vendor',
      })

      await ctx.runMutation(internal.tickets.updateInternal as any, {
        ticketId: args.ticketId,
        quoteStatus: 'awaiting_quotes',
      })
    } else {
      console.error(
        `Failed to send any outreach emails for ticket ${args.ticketId}`,
      )
    }

    return {
      sent: outreachResults.filter((r) => r.emailId).length,
      failed: outreachResults.filter((r) => r.error).length,
      results: outreachResults,
    }
  },
})

