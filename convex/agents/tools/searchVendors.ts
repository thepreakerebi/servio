'use node'

import { tool } from 'ai'
import { z } from 'zod'
import type { ActionCtx } from '../../_generated/server'

const searchVendorsSchema = z.object({
  location: z.string().describe('Location to search for vendors'),
  tags: z.array(z.string()).describe('Issue tags to match vendor specialties'),
  specialty: z.string().optional().describe('Specific vendor specialty to search for'),
  extractDetails: z
    .boolean()
    .optional()
    .describe('Whether to use Extract API for detailed vendor information'),
})

type SearchVendorsParams = z.infer<typeof searchVendorsSchema>

export function createSearchVendorsTool(ctx: ActionCtx) {
  return tool({
    description:
      'Search for local vendors using Firecrawl Search API and optionally extract detailed vendor information using Extract API',
    parameters: searchVendorsSchema,
    execute: async ({
      location,
      tags,
      specialty,
      extractDetails = false,
    }: SearchVendorsParams) => {
      const searchQuery = `${specialty || tags.join(' ')} ${location} maintenance repair service`

      // Call Firecrawl v2 Search API
      // Docs: https://docs.firecrawl.dev/features/search
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY
      if (!firecrawlApiKey) {
        throw new Error('FIRECRAWL_API_KEY not configured')
      }

      const searchResponse = await fetch('https://api.firecrawl.dev/v2/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firecrawlApiKey}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10,
          location: location,
          // Use 'web' source for standard web results (default)
          // Can also use ['web', 'news', 'images'] for mixed results
          sources: ['web'],
        }),
      })

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        throw new Error(`Firecrawl Search API error: ${searchResponse.statusText} - ${errorText}`)
      }

      const searchData = await searchResponse.json()

      // Parse and extract vendor information from web results
      // Response format per docs: { success: true, data: { web: [...], images: [...], news: [...] } }
      const webResults = searchData.data?.web || []
      let vendors = webResults.map((result: any) => ({
        businessName: result.title || 'Unknown',
        email: result.metadata?.email,
        phone: result.metadata?.phone,
        specialty: specialty || tags[0] || 'General',
        address: result.metadata?.address || location,
        rating: result.metadata?.rating,
        url: result.url,
        description: result.description,
        position: result.position, // Include position for ranking
      }))

      // Optionally use Extract API to get detailed vendor information
      // Docs: https://docs.firecrawl.dev/features/extract
      if (extractDetails && vendors.length > 0) {
        const extractUrls = vendors
          .filter((v: { url?: string }) => v.url)
          .slice(0, 5) // Limit to top 5 for cost control
          .map((v: { url: string }) => v.url)

        if (extractUrls.length > 0) {
          try {
            const extractResponse = await fetch(
              'https://api.firecrawl.dev/v2/extract',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${firecrawlApiKey}`,
                },
                body: JSON.stringify({
                  urls: extractUrls,
                  prompt:
                    'Extract vendor business information including business name, email, phone number, address, services offered, and any ratings or reviews.',
                  schema: {
                    type: 'object',
                    properties: {
                      businessName: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      address: { type: 'string' },
                      services: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      rating: { type: 'number' },
                    },
                  },
                  // Note: Can use agent: { model: 'FIRE-1' } for better extraction (costs more)
                  // Leaving it out for cost efficiency - uses default agent
                }),
              },
            )

            if (extractResponse.ok) {
              const extractData = await extractResponse.json()
              // Extract API response format per docs:
              // Multiple URLs: { success: true, data: [{...}, {...}] }
              // Single URL: { success: true, data: {...} }
              if (extractData.data) {
                const extractedVendors = Array.isArray(extractData.data)
                  ? extractData.data
                  : [extractData.data]

                vendors = vendors.map(
                  (
                    vendor: {
                      businessName: string
                      email?: string
                      phone?: string
                      address: string
                      rating?: number
                      url?: string
                      description?: string
                      position?: number
                    },
                    index: number,
                  ) => {
                    const extracted = extractedVendors[index]
                    if (extracted) {
                      return {
                        ...vendor,
                        businessName:
                          extracted.businessName || vendor.businessName,
                        email: extracted.email || vendor.email,
                        phone: extracted.phone || vendor.phone,
                        address: extracted.address || vendor.address,
                        rating: extracted.rating || vendor.rating,
                        services: extracted.services || [],
                      }
                    }
                    return vendor
                  },
                )
              }
            } else {
              // Log error but continue with search results
              const errorText = await extractResponse.text()
              console.error(
                `Firecrawl Extract API error: ${extractResponse.statusText} - ${errorText}`,
              )
            }
          } catch (error) {
            // If Extract API fails, continue with search results
            console.error('Firecrawl Extract API error:', error)
          }
        }
      }

      return { vendors }
    },
  } as any)
}

