export interface FeedbackResult {
  warning: string | null;
  suggestions: string[];
}

export function generateFeedback(_password: string): FeedbackResult {
  return {
    warning: null,
    suggestions: [],
  };
}
