'use node'

import { tool } from 'ai'
import { z } from 'zod'
import OpenAI from 'openai'
import { internal } from '../../_generated/api'
import type { ActionCtx } from '../../_generated/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const analyzeImageSchema = z.object({
  imageUrl: z.string().describe('URL of the image to analyze'),
})

type AnalyzeImageParams = z.infer<typeof analyzeImageSchema>

export function createAnalyzeImageTool(ctx: ActionCtx) {
  return tool({
    description:
      'Analyze an image to identify equipment type, problem description, and visual tags',
    parameters: analyzeImageSchema,
    execute: async ({ imageUrl }: AnalyzeImageParams) => {
      // Fetch image and convert to base64
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')

      // Call OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this maintenance issue image. Identify: 1) Equipment type, 2) Problem description, 3) Visual tags (e.g., "leak", "damage", "broken"). Return as JSON.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')

      return {
        equipmentType: analysis.equipmentType || 'Unknown',
        problemDescription: analysis.problemDescription || '',
        visualTags: analysis.visualTags || [],
      }
    },
  } as any)
}
