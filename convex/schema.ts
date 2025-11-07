import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,
  // Override auth_users table to add email index required by Convex Auth
  auth_users: defineTable({
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index('email', ['email']),
  // Users table extends auth_users with custom fields
  // Synced via auth callbacks in auth.ts
  // Note: Convex Auth requires an index named 'email' on the 'users' table
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    orgName: v.optional(v.string()),
    location: v.optional(v.string()),
    createdAt: v.number(),
    onboardingCompleted: v.optional(v.boolean()),
    emailVerificationTime: v.optional(v.number()), // Required by Convex Auth
    phoneVerificationTime: v.optional(v.number()), // Required by Convex Auth
  })
    .index('email', ['email']) // Required by Convex Auth - must be named 'email'
    .index('by_email', ['email']), // Our custom index for queries

  tickets: defineTable({
    createdBy: v.id('users'),
    issueType: v.optional(v.string()),
    predictedTags: v.array(v.string()),
    description: v.string(),
    location: v.optional(v.string()),
    photoId: v.optional(v.id('_storage')),
    createdAt: v.number(),
    status: v.string(),
    firecrawlResultsId: v.optional(v.id('firecrawlResults')),
    selectedVendorId: v.optional(v.id('vendors')),
    selectedVendorQuoteId: v.optional(v.id('vendorQuotes')),
    conversationId: v.optional(v.id('conversations')),
    scheduledDate: v.optional(v.number()),
    verificationPhotoId: v.optional(v.id('_storage')),
    closedAt: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
    quoteStatus: v.optional(
      v.union(
        v.literal('awaiting_quotes'),
        v.literal('quotes_received'),
        v.literal('vendor_selected'),
        v.literal('scheduling'),
      ),
    ),
  })
    .index('by_createdBy', ['createdBy'])
    .index('by_status', ['status'])
    .index('by_selectedVendorId', ['selectedVendorId'])
    .index('by_quoteStatus', ['quoteStatus'])
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
    emailStatus: v.optional(
      v.union(
        v.literal('valid'),
        v.literal('invalid'),
        v.literal('bounced'),
        v.literal('complained'),
        v.literal('doNotEmail'),
      ),
    ),
    lastEmailError: v.optional(v.string()),
    jobs: v.array(
      v.object({
        ticketId: v.id('tickets'),
        assignedAt: v.number(),
        completedAt: v.optional(v.number()),
        feedback: v.optional(v.string()),
      }),
    ),
    embedding: v.optional(v.array(v.float64())),
  })
    .index('by_email', ['email'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['specialty'],
    }),

  emailMappings: defineTable({
    emailId: v.string(), // Resend email ID
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    sentAt: v.number(),
    status: v.optional(
      v.union(
        v.literal('sent'),
        v.literal('delivered'),
        v.literal('bounced'),
        v.literal('complained'),
        v.literal('opened'),
        v.literal('clicked'),
      ),
    ),
    lastEventAt: v.optional(v.number()),
    bounceReason: v.optional(v.string()),
  })
    .index('by_emailId', ['emailId'])
    .index('by_ticketId', ['ticketId'])
    .index('by_vendorId', ['vendorId']),

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
        vendorId: v.optional(v.id('vendors')), // Optional vendor ID if vendor exists in database
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

  vendorOutreach: defineTable({
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    emailId: v.string(), // Resend email ID
    emailSentAt: v.number(),
    status: v.union(
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('opened'),
      v.literal('responded'),
      v.literal('bounced'),
      v.literal('expired'),
    ),
    followUpSentAt: v.optional(v.number()),
    expiresAt: v.number(), // Quote request expiration time
    embedding: v.optional(v.array(v.float64())),
  })
    .index('by_ticketId', ['ticketId'])
    .index('by_vendorId', ['vendorId'])
    .index('by_emailId', ['emailId'])
    .index('by_status', ['status'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['ticketId', 'vendorId', 'status'],
    }),

  vendorQuotes: defineTable({
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
    vendorOutreachId: v.id('vendorOutreach'),
    price: v.number(), // Price in cents or smallest currency unit
    currency: v.string(), // Currency code (USD, EUR, etc.)
    estimatedDeliveryTime: v.number(), // Estimated time in hours
    ratings: v.optional(v.number()), // Vendor-provided rating/review score
    responseText: v.string(), // Raw email response from vendor
    status: v.union(
      v.literal('pending'),
      v.literal('received'),
      v.literal('selected'),
      v.literal('rejected'),
      v.literal('expired'),
    ),
    responseReceivedAt: v.optional(v.number()),
    createdAt: v.number(),
    score: v.optional(v.number()), // Calculated ranking score
    embedding: v.optional(v.array(v.float64())),
  })
    .index('by_ticketId', ['ticketId'])
    .index('by_vendorId', ['vendorId'])
    .index('by_status', ['status'])
    .index('by_ticketId_status', ['ticketId', 'status'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['ticketId', 'vendorId', 'status'],
    }),
})
