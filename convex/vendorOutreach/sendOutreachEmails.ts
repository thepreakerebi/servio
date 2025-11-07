'use node'

import { Resend } from '@convex-dev/resend'
import { v } from 'convex/values'
import { action } from '../_generated/server'
import { components, internal } from '../_generated/api'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent,
})

/**
 * Send outreach emails to all discovered vendors for a ticket
 * This is called after vendors are discovered to request quotes
 */
export const sendOutreachEmails = action({
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
    const ticket = await ctx.runQuery(internal.tickets.getByIdInternal, {
      ticketId: args.ticketId,
    })

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

    const firecrawlResults = await ctx.runQuery(
      internal.firecrawlResults.getById,
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
    const userData = await ctx.runQuery(internal.users.getById, {
      userId: ticket.createdBy,
    })
    const location = userData?.location || ticket.location || 'Not specified'

    // Create or get conversation
    let conversationId = ticket.conversationId
    if (!conversationId) {
      conversationId = await ctx.runMutation(internal.conversations.create, {
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
    const expiresAt = Date.now() + 72 * 60 * 60 * 1000

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
        let vendorId: string
        if (vendorResult.vendorId) {
          vendorId = vendorResult.vendorId
        } else {
          // Create vendor if doesn't exist
          vendorId = await ctx.runMutation(internal.vendors.create, {
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
          internal.agents.emailDraftAgent.draftVendorEmail,
          {
            ticketId: args.ticketId,
            vendorId,
          },
        )

        // Get vendor data
        const vendor = await ctx.runQuery(internal.vendors.getByIdInternal, {
          vendorId,
        })

        if (!vendor) {
          outreachResults.push({
            vendorId,
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
            vendorId,
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
        await ctx.runMutation(internal.emails.storeEmailMapping, {
          emailId: emailId as string,
          ticketId: args.ticketId,
          vendorId,
        })

        // Create outreach record
        const outreachId = await ctx.runMutation(internal.vendorOutreach.create, {
          ticketId: args.ticketId,
          vendorId,
          emailId: emailId as string,
          expiresAt,
        })

        // Schedule embedding generation for vendor outreach
        await ctx.scheduler.runAfter(
          0,
          internal.embeddings.generateVendorOutreachEmbedding,
          {
            outreachId,
          },
        )

        // Add message to conversation
        await ctx.runMutation(internal.conversations.addMessage, {
          conversationId,
          sender: 'agent',
          message: `Quote request sent to ${vendor.businessName}`,
        })

        outreachResults.push({
          vendorId,
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
    const successfulSends = outreachResults.filter((r) => r.emailId).length

    if (successfulSends > 0) {
      await ctx.runMutation(internal.tickets.updateStatus, {
        ticketId: args.ticketId,
        status: 'Awaiting Vendor',
      })

      await ctx.runMutation(internal.tickets.updateInternal, {
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

