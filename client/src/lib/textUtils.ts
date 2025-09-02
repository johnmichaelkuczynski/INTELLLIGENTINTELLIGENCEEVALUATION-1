/**
 * Utility functions for text processing and cleanup
 */

/**
 * Remove markdown and other markup formatting from text
 */
export function stripMarkup(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove inline code markers
    .replace(/`([^`]+)`/g, '$1')
    // Remove code block markers
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove blockquote markers
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove link markup but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove reference links
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    // Remove image markup
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

/**
 * Clean up AI response text by removing markup and formatting consistently
 */
export function cleanAIResponse(text: string): string {
  const cleaned = stripMarkup(text);
  
  // Ensure proper sentence spacing
  return cleaned
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format text for display while preserving meaningful structure
 */
export function formatForDisplay(text: string): string {
  const cleaned = cleanAIResponse(text);
  
  // Preserve paragraph breaks
  return cleaned
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .join('\n\n');
}