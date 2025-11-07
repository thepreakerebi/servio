'use node'

import { generateObject, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { getDraftEmailPrompt } from '../../prompts/draftEmail'

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
        prompt: getDraftEmailPrompt({
          vendorInfo,
          location,
          ticketDetails,
          imageUrl,
        }),
      })

      return object
    },
  } as any)
}

