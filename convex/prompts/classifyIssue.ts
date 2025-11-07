/**
 * Prompt for classifying maintenance issues (used in classifyIssue tool)
 */
export function getClassifyIssuePrompt(description: string) {
  // Escape the description to handle quotes, apostrophes, and newlines safely
  const escapedDescription = description
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim()

  return `Classify this maintenance issue description: "${escapedDescription}"
        
        Return:
        - issueType: The type of equipment or issue (e.g., "HVAC", "Plumbing", "Electrical")
        - tags: Array of relevant tags (e.g., ["leak", "urgent", "kitchen"])
        - urgency: One of low, medium, high, critical`
}

