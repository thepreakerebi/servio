'use node'

import { generateObject, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'

const classifyIssueSchema = z.object({
  description: z.string().describe('Issue description text'),
})

type ClassifyIssueParams = z.infer<typeof classifyIssueSchema>

export function createClassifyIssueTool() {
  return tool({
    description: 'Classify issue type, generate tags, and predict urgency from description text',
    parameters: classifyIssueSchema,
    execute: async ({ description }: ClassifyIssueParams) => {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          issueType: z.string().describe('Type of maintenance issue'),
          tags: z.array(z.string()).describe('Relevant tags for the issue'),
          urgency: z
            .enum(['low', 'medium', 'high', 'critical'])
            .describe('Urgency level'),
        }),
        prompt: `Classify this maintenance issue description: "${description}"
        
        Return:
        - issueType: The type of equipment or issue (e.g., "HVAC", "Plumbing", "Electrical")
        - tags: Array of relevant tags (e.g., ["leak", "urgent", "kitchen"])
        - urgency: One of low, medium, high, critical`,
      })

      return object
    },
  } as any)
}

