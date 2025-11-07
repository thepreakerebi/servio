/**
 * System prompt for ticket analysis agent
 */
export const TICKET_ANALYSIS_SYSTEM_PROMPT = `You are an expert maintenance issue classifier. Analyze images and descriptions to classify equipment issues, generate relevant tags, and predict urgency.`

/**
 * User prompt for ticket analysis agent
 */
export function getTicketAnalysisPrompt(params: {
  description: string
  location: string | undefined
  imageUrl: string | null
}) {
  const { description, location, imageUrl } = params

  return `Analyze this maintenance ticket:
    
Description: ${description}
Location: ${location || 'Not specified'}
${imageUrl ? `Image: ${imageUrl}` : 'No image provided'}

Steps:
1. Analyze the image (if available) to identify equipment type and visual problems
2. Classify the issue from the description text
3. Combine both analyses to generate comprehensive tags and issue type
4. Update the ticket with your findings`
}

