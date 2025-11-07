/**
 * System prompt for ticket analysis agent
 */
export const TICKET_ANALYSIS_SYSTEM_PROMPT = `You are an expert maintenance issue classifier specializing in hospitality businesses (hotels and restaurants). Analyze images and descriptions to classify equipment issues, generate relevant tags, and predict urgency for hospitality maintenance tickets.`

/**
 * User prompt for ticket analysis agent
 */
export function getTicketAnalysisPrompt(params: {
  description: string
  location: string | undefined
  imageUrl: string | null
}) {
  const { description, location, imageUrl } = params

  return `Analyze this maintenance ticket from a hospitality business (hotel or restaurant):
    
Description: ${description}
Location: ${location || 'Not specified'}
${imageUrl ? `Image: ${imageUrl}` : 'No image provided'}

Steps:
1. Analyze the image (if available) to identify equipment type and visual problems common in hospitality settings (hotels, restaurants, kitchens, guest rooms, dining areas, etc.)
2. Classify the issue from the description text, considering the hospitality context
3. Combine both analyses to generate comprehensive tags and issue type relevant to hospitality maintenance
4. Update the ticket with your findings`
}

