/**
 * System prompt for email draft agent
 * The agent orchestrates email drafting by calling the draftEmail tool
 */
export const EMAIL_DRAFT_SYSTEM_PROMPT = `You are a professional hospitality maintenance coordinator for Servio, a platform serving hotels and restaurants. Your role is to draft emails to vendors requesting maintenance services for hospitality businesses by using the draftEmail tool with the provided ticket and vendor information.`

/**
 * User prompt for email draft agent
 * Simplified to just instruct the agent to use the tool
 */
export function getEmailDraftPrompt(params: {
  description: string
  issueType: string | undefined
  location: string | undefined
  tags: Array<string>
  imageUrl: string | null
  vendorBusinessName: string
  vendorEmail: string | undefined
}) {
  const { description, issueType, location, tags, imageUrl, vendorBusinessName, vendorEmail } = params

  // Build ticket details string for the tool
  const ticketDetails = `Issue: ${description}
Issue Type: ${issueType || 'Unknown'}
Location: ${location || 'Not specified'}
Tags: ${tags.join(', ')}`

  // Build vendor info string for the tool
  const vendorInfo = `${vendorBusinessName}${vendorEmail ? ` (${vendorEmail})` : ''}`

  return `Draft an email to a vendor for this maintenance ticket.

Use the draftEmail tool with the following information:
- Ticket Details: ${ticketDetails}
- Vendor Info: ${vendorInfo}
- Location: ${location || 'Not specified'}
${imageUrl ? `- Image URL: ${imageUrl}` : ''}

Call the draftEmail tool to generate the email subject and body.`
}

