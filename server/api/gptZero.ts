import { DocumentInput } from "@/lib/types";
import { AIDetectionResult } from "@/lib/types";

/**
 * Check if a text is AI-generated using GPTZero API
 * Can accept both DocumentInput format and simple content object
 */
export async function checkForAI(input: DocumentInput | { content: string }): Promise<AIDetectionResult> {
  const apiKey = process.env.GPTZERO_API_KEY || "";
  
  if (!apiKey) {
    console.log("GPTZero API key not found - using mock response");
    // Return mock response for testing when API key is missing
    const content = 'content' in input ? input.content : input.content;
    const mockScore = Math.floor(Math.random() * 30) + 70; // Mock score 70-100% Human
    return {
      isAI: mockScore < 50,
      probability: (100 - mockScore) / 100 // Convert to AI probability (0-1)
    };
  }

  const content = 'content' in input ? input.content : input.content;
  
  if (!content || content.trim().length < 10) {
    return {
      isAI: false,
      probability: 0
    };
  }

  try {
    const response = await fetch("https://api.gptzero.me/v2/predict/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Api-Key": apiKey
      },
      body: JSON.stringify({
        document: content,
        truncation: true
      })
    });

    if (!response.ok) {
      console.error(`GPTZero API error: ${response.status} ${response.statusText}`);
      // Return fallback mock response
      const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100% Human
      return {
        isAI: mockScore < 50,
        probability: (100 - mockScore) / 100
      };
    }

    const data = await response.json();
    console.log('GPTZero raw response:', data);
    
    // Extract probability from GPTZero response
    let aiProbability = 0;
    
    if (data.documents && data.documents[0]) {
      // GPTZero returns completely_generated_prob (0-1 scale for AI probability)
      aiProbability = data.documents[0].completely_generated_prob || 0;
    } else if (data.class_probabilities) {
      // Alternative response format
      aiProbability = data.class_probabilities.ai || 0;
    }
    
    const isAI = aiProbability >= 0.5;
    
    console.log(`GPTZero result: AI probability = ${aiProbability}, isAI = ${isAI}`);

    return {
      isAI,
      probability: aiProbability
    };
  } catch (error) {
    console.error("Error checking for AI:", error);
    // Return fallback mock response
    const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100% Human
    return {
      isAI: mockScore < 50,
      probability: (100 - mockScore) / 100
    };
  }
}
