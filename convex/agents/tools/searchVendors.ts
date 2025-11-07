'use node'

import { tool } from 'ai'
import { z } from 'zod'
import { VENDOR_EXTRACTION_PROMPT } from '../../prompts/vendorExtraction'

const searchVendorsSchema = z.object({
  location: z.string().describe('Location to search for vendors'),
  tags: z.array(z.string()).describe('Issue tags to match vendor specialties'),
  specialty: z.string().optional().describe('Specific vendor specialty to search for'),
})

type SearchVendorsParams = z.infer<typeof searchVendorsSchema>

export function createSearchVendorsTool() {
  return tool({
    description:
      'Search for local vendors using Firecrawl Search API to discover URLs, then use Extract API to get accurate vendor information from web pages',
    parameters: searchVendorsSchema,
    execute: async ({
      location,
      tags,
      specialty,
    }: SearchVendorsParams) => {
      const searchQuery = `${specialty || tags.join(' ')} ${location} maintenance repair service`

      // Call Firecrawl v2 Search API to discover vendor URLs
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
          sources: ['web'],
        }),
      })

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        throw new Error(`Firecrawl Search API error: ${searchResponse.statusText} - ${errorText}`)
      }

      const searchData = await searchResponse.json()

      // Get URLs from search results
      // Response format per docs: { success: true, data: { web: [...], images: [...], news: [...] } }
      const webResults = searchData.data?.web || []
      
      // Extract URLs from top results (limit to top 8 for cost control)
      const extractUrls = webResults
        .slice(0, 8)
        .map((result: any) => result.url)
        .filter((url: string | undefined): url is string => Boolean(url))

      if (extractUrls.length === 0) {
        return { vendors: [] }
      }

      // Use Firecrawl Extract API to get accurate vendor information from web pages
      // This is more reliable than parsing search metadata
      // Docs: https://docs.firecrawl.dev/features/extract
      try {
        const extractResponse = await fetch('https://api.firecrawl.dev/v2/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firecrawlApiKey}`,
          },
          body: JSON.stringify({
            urls: extractUrls,
            prompt: VENDOR_EXTRACTION_PROMPT,
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
        })

        if (!extractResponse.ok) {
          const errorText = await extractResponse.text()
          console.error(
            `Firecrawl Extract API error: ${extractResponse.statusText} - ${errorText}`,
          )
          return { vendors: [] }
        }

        const extractData = await extractResponse.json()
        
        // Extract API response format per docs:
        // Multiple URLs: { success: true, data: [{...}, {...}] }
        // Single URL: { success: true, data: {...} }
        if (!extractData.data) {
          return { vendors: [] }
        }

        const extractedVendors = Array.isArray(extractData.data)
          ? extractData.data
          : [extractData.data]

        // Map extracted data to vendor format, preserving search ranking info
        const vendors = extractedVendors.map((extracted: any, index: number) => {
          const searchResult = webResults[index]
          return {
            businessName: extracted.businessName || searchResult?.title || 'Unknown',
            email: extracted.email,
            phone: extracted.phone,
            specialty: specialty || tags[0] || 'General',
            address: extracted.address || searchResult?.metadata?.address || location,
            rating: extracted.rating || searchResult?.metadata?.rating,
            url: extractUrls[index],
            description: searchResult?.description,
            position: searchResult?.position || index + 1,
            services: extracted.services || [],
          }
        })

        return { vendors }
      } catch (error) {
        console.error('Firecrawl Extract API error:', error)
        return { vendors: [] }
      }
    },
  } as any)
}

