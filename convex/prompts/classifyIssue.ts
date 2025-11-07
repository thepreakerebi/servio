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

  return `Classify this maintenance issue description from a hospitality business (hotel or restaurant): "${escapedDescription}"
        
        Return:
        - issueType: The type of equipment or issue (e.g., "HVAC", "Plumbing", "Electrical", "Kitchen Equipment", "Guest Room", "Dining Area")
        - tags: Array of relevant tags considering hospitality context (e.g., ["leak", "urgent", "kitchen", "restaurant", "hotel", "guest room"])
        - urgency: One of low, medium, high, critical (considering impact on hospitality operations)`
}

