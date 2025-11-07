'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'

/**
 * Rank vendors based on their quotes
 * Scoring considers: price (lower is better), delivery time (faster is better),
 * ratings (higher is better), response time (faster is better)
 */
export const rankVendors = action({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    rankedQuotes: Array<Doc<'vendorQuotes'> & { score: number }>
  }> => {
    // Get all received quotes for this ticket
    const quotes: Array<Doc<'vendorQuotes'>> = await ctx.runQuery(
      internal.vendorQuotes.getByTicketIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (quotes.length === 0) {
      return { rankedQuotes: [] }
    }

    // Get ticket to understand urgency
    const ticket: Doc<'tickets'> | null = await ctx.runQuery(
      internal.tickets.getByIdInternal as any,
      {
        ticketId: args.ticketId,
      },
    )

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Calculate scores for each quote
    const quotesWithScores: Array<Doc<'vendorQuotes'> & { score: number }> =
      await Promise.all(
        quotes.map(async (quote: Doc<'vendorQuotes'>) => {
          // Get vendor and outreach info
          const vendor: Doc<'vendors'> | null = await ctx.runQuery(
            internal.vendors.getByIdInternal as any,
            {
              vendorId: quote.vendorId,
            },
          )

          const outreach: Doc<'vendorOutreach'> | null = await ctx.runQuery(
            internal.vendorOutreach.getByIdInternal as any,
            {
              outreachId: quote.vendorOutreachId,
            },
          )

          if (!vendor || !outreach) {
            return { ...quote, score: 0 }
          }

          // Calculate response time (hours between email sent and response received)
          // Handle case where responseReceivedAt might be undefined
          let responseTimeHours = 0
          let responseScore = 0

          if (quote.responseReceivedAt) {
            responseTimeHours =
              (quote.responseReceivedAt - outreach.emailSentAt) /
              (1000 * 60 * 60)
            // Response time: faster is better (normalized, assume 72 hours is max expected)
            const maxResponseTime = 72
            responseScore = Math.max(0, 1 - responseTimeHours / maxResponseTime)
          }

          // Normalize values for scoring
          // Price: lower is better (inverse score)
          const prices = quotes.map((q: Doc<'vendorQuotes'>) => q.price)
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          const priceRange = maxPrice - minPrice || 1
          const priceScore =
            priceRange > 0 ? 1 - (quote.price - minPrice) / priceRange : 0.5

          // Delivery time: faster is better (inverse score)
          const deliveryTimes = quotes.map(
            (q: Doc<'vendorQuotes'>) => q.estimatedDeliveryTime,
          )
          const minTime = Math.min(...deliveryTimes)
          const maxTime = Math.max(...deliveryTimes)
          const timeRange = maxTime - minTime || 1
          const deliveryScore =
            timeRange > 0
              ? 1 - (quote.estimatedDeliveryTime - minTime) / timeRange
              : 0.5

          // Ratings: higher is better (normalized to 0-1)
          const ratingScore = quote.ratings ? quote.ratings / 5 : 0.5

          // Historical vendor rating (if available)
          const vendorRatingScore = vendor.rating ? vendor.rating / 5 : 0.5

          // Weighted scoring
          // Price: 30%, Delivery Time: 25%, Ratings: 20%, Response Time: 15%, Vendor History: 10%
          const totalScore =
            priceScore * 0.3 +
            deliveryScore * 0.25 +
            ratingScore * 0.2 +
            responseScore * 0.15 +
            vendorRatingScore * 0.1

          return {
            ...quote,
            score: totalScore,
          }
        }),
      )

    // Update scores in database
    for (const quoteWithScore of quotesWithScores) {
      await ctx.runMutation(internal.vendorQuotes.updateScore as any, {
        quoteId: quoteWithScore._id,
        score: quoteWithScore.score,
      })
    }

    // Sort by score (highest first)
    quotesWithScores.sort(
      (
        a: Doc<'vendorQuotes'> & { score: number },
        b: Doc<'vendorQuotes'> & { score: number },
      ) => (b.score || 0) - (a.score || 0),
    )

    return {
      rankedQuotes: quotesWithScores,
    }
  },
})
