'use node'

import { tool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'

export function createDraftEmailTool() {
  return tool({
    description: 'Draft a professional email to a vendor with ticket details, images, and location',
    parameters: z.object({
      ticketDetails: z.string().describe('Ticket description and details'),
      vendorInfo: z.string().describe('Vendor business name and contact info'),
      location: z.string().describe('Location of the issue'),
      imageUrl: z.string().optional().describe('URL of the issue photo'),
    }),
    execute: async ({
      ticketDetails,
      vendorInfo,
      location,
      imageUrl,
    }: {
      ticketDetails: string
      vendorInfo: string
      location: string
      imageUrl?: string
    }) => {
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Professional email body'),
        }),
        prompt: `Draft a professional maintenance request email to a vendor.

Vendor: ${vendorInfo}
Location: ${location}
Issue Details: ${ticketDetails}
${imageUrl ? `Image available at: ${imageUrl}` : ''}

The email should:
- Be professional and courteous
- Clearly describe the issue
- Include location and relevant details
- Request a quote or availability
- Include contact information for follow-up`,
      })

      return object
    },
  })
}

