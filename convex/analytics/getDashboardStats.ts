import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'
import type { Id } from '../_generated/dataModel'

/**
 * Get dashboard analytics/KPIs for the authenticated user
 * Returns ticket counts, average response/fix times, and most used vendor
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
      (t) => t.status === 'Closed' && t.closedAt,
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
    }
  },
})
