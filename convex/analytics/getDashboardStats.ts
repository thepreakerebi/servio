import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'
import type { Id } from '../_generated/dataModel'

/**
 * Get dashboard analytics/KPIs for the authenticated user
 * Returns ticket counts, average response/fix times, most used vendor, and quote statistics
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)

    // Get all tickets for the user
    const tickets = await ctx.db
      .query('tickets')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', user._id))
      .collect()

    // Calculate ticket counts by status
    const ticketCountsByStatus: Record<string, number> = {}
    tickets.forEach((ticket) => {
      ticketCountsByStatus[ticket.status] =
        (ticketCountsByStatus[ticket.status] || 0) + 1
    })

    // Get all quotes for user's tickets
    const ticketIds = tickets.map((t) => t._id)
    const allQuotes = await Promise.all(
      ticketIds.map(async (ticketId) => {
        return await ctx.db
          .query('vendorQuotes')
          .withIndex('by_ticketId', (q) => q.eq('ticketId', ticketId))
          .collect()
      }),
    )
    const quotes = allQuotes.flat()

    // Calculate quote statistics
    const newQuotesCount = quotes.filter((q) => q.status === 'received').length
    const pendingQuotesCount = quotes.filter((q) => q.status === 'pending').length
    const selectedQuotesCount = quotes.filter((q) => q.status === 'selected').length
    const rejectedQuotesCount = quotes.filter((q) => q.status === 'rejected').length
    const expiredQuotesCount = quotes.filter((q) => q.status === 'expired').length

    // Calculate average quote price (only for received quotes)
    const receivedQuotes = quotes.filter((q) => q.status === 'received')
    const quotePrices = receivedQuotes.map((q) => q.price)
    const averageQuotePrice =
      quotePrices.length > 0
        ? Math.round(
            quotePrices.reduce((a, b) => a + b, 0) / quotePrices.length,
          )
        : null

    // Calculate average quote delivery time (only for received quotes)
    const quoteDeliveryTimes = receivedQuotes.map((q) => q.estimatedDeliveryTime)
    const averageQuoteDeliveryTimeHours =
      quoteDeliveryTimes.length > 0
        ? Math.round(
            (quoteDeliveryTimes.reduce((a, b) => a + b, 0) /
              quoteDeliveryTimes.length) *
              100,
          ) / 100
        : null

    // Count tickets awaiting quote selection (have quotes but no selected vendor)
    const ticketsAwaitingSelection = tickets.filter(
      (t) =>
        t.quoteStatus === 'quotes_received' && !t.selectedVendorQuoteId,
    ).length

    // Calculate average response time (time from ticket creation to first vendor reply)
    const ticketsWithConversations = await Promise.all(
      tickets
        .filter((t) => t.conversationId)
        .map(async (ticket) => {
          const conversation = await ctx.db.get(ticket.conversationId!)
          return { ticket, conversation }
        }),
    )

    const responseTimes: Array<number> = []
    ticketsWithConversations.forEach(({ ticket, conversation }) => {
      if (conversation) {
        // Find first vendor message (reply)
        const firstVendorMessage = conversation.messages.find(
          (msg) => msg.sender === 'vendor',
        )
        if (firstVendorMessage) {
          // Response time = time from ticket creation to first vendor reply
          const responseTime = firstVendorMessage.date - ticket.createdAt
          if (responseTime > 0) {
            responseTimes.push(responseTime)
          }
        }
      }
    })

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null

    // Calculate average fix time (time from creation to closure)
    const closedTickets = tickets.filter(
      (t) => t.status === 'Fixed' && t.closedAt,
    )
    const fixTimes = closedTickets
      .map((ticket) => ticket.closedAt! - ticket.createdAt)
      .filter((time) => time > 0)

    const averageFixTime =
      fixTimes.length > 0
        ? fixTimes.reduce((a, b) => a + b, 0) / fixTimes.length
        : null

    // Find most used vendor
    const vendorUsage: Record<string, number> = {}
    tickets.forEach((ticket) => {
      if (ticket.selectedVendorId) {
        const vendorId = ticket.selectedVendorId
        vendorUsage[vendorId] = (vendorUsage[vendorId] || 0) + 1
      }
    })

    // Find most used vendor ID with proper type safety
    const vendorEntries = Object.entries(vendorUsage)
    const mostUsedVendorId: Id<'vendors'> | null =
      vendorEntries.length > 0
        ? (vendorEntries.reduce((a, b) => (a[1] > b[1] ? a : b))[0] as Id<'vendors'>)
        : null

    const mostUsedVendor = mostUsedVendorId
      ? await ctx.db.get(mostUsedVendorId)
      : null

    return {
      totalTickets: tickets.length,
      ticketCountsByStatus,
      averageResponseTimeMs: averageResponseTime,
      averageResponseTimeHours: averageResponseTime
        ? Math.round((averageResponseTime / (1000 * 60 * 60)) * 100) / 100
        : null,
      averageFixTimeMs: averageFixTime,
      averageFixTimeHours: averageFixTime
        ? Math.round((averageFixTime / (1000 * 60 * 60)) * 100) / 100
        : null,
      mostUsedVendor: mostUsedVendor
        ? {
            _id: mostUsedVendor._id,
            businessName: mostUsedVendor.businessName,
            usageCount: mostUsedVendorId ? vendorUsage[mostUsedVendorId] : 0,
          }
        : null,
      // Quote statistics
      newQuotesCount, // Quotes received that need review
      pendingQuotesCount, // Quotes awaiting vendor response
      selectedQuotesCount, // Quotes that were selected
      rejectedQuotesCount, // Quotes that were rejected
      expiredQuotesCount, // Quotes that expired
      totalQuotesReceived: receivedQuotes.length,
      ticketsAwaitingSelection, // Tickets with quotes but no vendor selected yet
      averageQuotePrice, // Average price in smallest currency unit (e.g., cents for USD)
      averageQuoteDeliveryTimeHours, // Average delivery time in hours
    }
  },
})
