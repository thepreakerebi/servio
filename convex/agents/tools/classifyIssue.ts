'use node'

import { generateObject, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { getClassifyIssuePrompt } from '../../prompts/classifyIssue'

const classifyIssueSchema = z.object({
  description: z.string().describe('Issue description text'),
})

type ClassifyIssueParams = z.infer<typeof classifyIssueSchema>

export function createClassifyIssueTool() {
  return tool({
    description:
      'Classify issue type, generate tags, and predict urgency from description text',
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
        prompt: getClassifyIssuePrompt(description),
      })

      return object
    },
  } as any)
}
