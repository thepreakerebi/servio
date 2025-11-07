/**
 * System prompt for vendor discovery agent
 */
export const VENDOR_DISCOVERY_SYSTEM_PROMPT = `You are an expert at finding local service providers for hospitality businesses (hotels and restaurants). Search for vendors that match the issue type and location, prioritize those with hospitality experience, filter by relevance, and store results.`

/**
 * User prompt for vendor discovery agent
 */
export function getVendorDiscoveryPrompt(params: {
  issueType: string | undefined
  tags: Array<string>
  location: string
}) {
  const { issueType, tags, location } = params

  return `Find local vendors for this maintenance ticket from a hospitality business (hotel or restaurant):
    
Issue Type: ${issueType || 'Unknown'}
Tags: ${tags.join(', ')}
Location: ${location}

Steps:
1. Search for vendors matching the issue type and location, prioritizing those with experience serving hospitality businesses (hotels, restaurants)
2. Evaluate results and filter by relevance to hospitality maintenance needs
3. Refine search if needed to find better matches for hospitality businesses
4. Store the best vendor candidates`
}

