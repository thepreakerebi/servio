'use node'

import { generateObject, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'

export function createDraftEmailTool() {
  return tool({
    description: 'Draft a professional email to a vendor with ticket details, images, and location',
    parameters: z.object({
      ticketDetails: z.string().describe('Ticket description and details'),
      vendorInfo: z.string().describe('Vendor business name and contact info'),
      location: z.string().describe('Location of the issue'),
      imageUrl: z.string().optional().describe('URL of the issue photo'),
    }),
    execute: async (params: {
      ticketDetails: string
      vendorInfo: string
      location: string
      imageUrl?: string
    }) => {
      const { ticketDetails, vendorInfo, location, imageUrl } = params
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Professional email body'),
        }),
        prompt: `Draft a professional maintenance request email to a vendor requesting a quote.

Vendor: ${vendorInfo}
Location: ${location}
Issue Details: ${ticketDetails}
${imageUrl ? `Image available at: ${imageUrl}` : ''}

The email should:
- Be professional and courteous
- Clearly describe the issue and location
- Request a detailed quote with the following information:
  1. **Price**: Please provide your total price/quote for this work (include currency)
  2. **Delivery Time**: Please provide your estimated completion/delivery time (in hours or days)
  3. **Ratings/Reviews**: If available, please share any relevant ratings or reviews from previous similar work
- Explain that Servio is a hospitality maintenance platform that helps connect service providers with maintenance needs
- Include that we're collecting quotes from multiple vendors to provide the best options to our client
- Request a response within 48-72 hours
- Include contact information for follow-up questions`,
      })

      return object
    },
  } as any)
}

