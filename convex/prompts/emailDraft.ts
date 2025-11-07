/**
 * System prompt for email draft agent
 */
export const EMAIL_DRAFT_SYSTEM_PROMPT = `You are a professional hospitality maintenance coordinator. Draft clear, professional emails to vendors requesting maintenance services.`

/**
 * User prompt for email draft agent
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

  return `Draft an email to a vendor for this maintenance ticket:

Ticket Details: ${description}
Issue Type: ${issueType || 'Unknown'}
Location: ${location || 'Not specified'}
Tags: ${tags.join(', ')}
${imageUrl ? `Image: ${imageUrl}` : ''}

Vendor: ${vendorBusinessName}
${vendorEmail ? `Email: ${vendorEmail}` : ''}

Steps:
1. Gather all ticket context
2. Draft a professional email with subject and body
3. Review and refine the email
4. Return the final email content`
}

