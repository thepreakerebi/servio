import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,
  // Users table extends auth_users with custom fields
  // Synced via auth callbacks in auth.ts
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    orgName: v.optional(v.string()),
    location: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  tickets: defineTable({
    createdBy: v.id('users'),
    issueType: v.optional(v.string()),
    predictedTags: v.array(v.string()),
    description: v.string(),
    location: v.string(),
    photoId: v.optional(v.id('_storage')),
    createdAt: v.number(),
    status: v.string(),
    firecrawlResultsId: v.optional(v.id('firecrawlResults')),
    selectedVendorId: v.optional(v.id('vendors')),
    conversationId: v.optional(v.id('conversations')),
    scheduledDate: v.optional(v.number()),
    verificationPhotoId: v.optional(v.id('_storage')),
    closedAt: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index('by_createdBy', ['createdBy'])
    .index('by_status', ['status'])
    .index('by_selectedVendorId', ['selectedVendorId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['status', 'issueType'],
    }),

  vendors: defineTable({
    businessName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    specialty: v.string(),
    address: v.string(),
    rating: v.optional(v.number()),
    jobs: v.array(
      v.object({
        ticketId: v.id('tickets'),
        assignedAt: v.number(),
        completedAt: v.optional(v.number()),
        feedback: v.optional(v.string()),
      }),
    ),
    embedding: v.optional(v.array(v.float64())),
  }).vectorIndex('by_embedding', {
    vectorField: 'embedding',
    dimensions: 1536,
    filterFields: ['specialty'],
  }),

  firecrawlResults: defineTable({
    ticketId: v.id('tickets'),
    results: v.array(
      v.object({
        businessName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        specialty: v.string(),
        address: v.string(),
        rating: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
  }).index('by_ticketId', ['ticketId']),

  conversations: defineTable({
    ticketId: v.id('tickets'),
    messages: v.array(
      v.object({
        sender: v.union(
          v.literal('user'),
          v.literal('agent'),
          v.literal('vendor'),
        ),
        message: v.string(),
        date: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    embedding: v.optional(v.array(v.float64())),
  })
    .index('by_ticketId', ['ticketId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['ticketId'],
    }),
})
