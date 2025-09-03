import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { cleanAIResponse } from '../lib/textUtils';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface FictionAssessmentResult {
  worldCoherence: number;
  emotionalPlausibility: number;
  thematicDepth: number;
  narrativeStructure: number;
  proseControl: number;
  overallFictionScore: number;
  detailedAssessment: string;
}

const FICTION_ASSESSMENT_PROMPT = `FICTION ASSESSMENT: EVALUATING FICTIONAL WORLD CONSTRUCTION

Your task: Assess how well this fiction sample constructs a compelling fictional reality.

FICTION-SPECIFIC EVALUATION CRITERIA (0-100 scale):

WORLD COHERENCE: How consistent and believable is the fictional world?
- Score 95-100: Perfect internal consistency, every detail supports the world's logic
- Score 90-94: Strong world-building with clear rules and consistent details
- Score 80-89: Good world coherence with minor inconsistencies
- Score below 80: Noticeable gaps in world logic

EMOTIONAL PLAUSIBILITY: How authentic and believable are the characters' emotions and reactions?
- Score 95-100: Deeply authentic emotional responses that feel completely genuine
- Score 90-94: Strong emotional authenticity with convincing character psychology
- Score 80-89: Generally believable emotions with occasional false notes
- Score below 80: Unconvincing or inconsistent emotional responses

THEMATIC DEPTH: How meaningful and well-developed are the underlying themes?
- Score 95-100: Profound thematic exploration with multiple layers of meaning
- Score 90-94: Strong thematic development with clear significance
- Score 80-89: Good thematic presence with adequate development
- Score below 80: Weak or superficial thematic content

NARRATIVE STRUCTURE: How effectively is the story constructed and paced?
- Score 95-100: Masterful narrative architecture with perfect pacing and structure
- Score 90-94: Excellent story construction with strong pacing
- Score 80-89: Solid narrative structure with good flow
- Score below 80: Structural weaknesses or pacing issues

PROSE CONTROL: How skillful is the writing craft and language use?
- Score 95-100: Exceptional prose mastery with perfect control of language
- Score 90-94: Strong prose skills with excellent command of style
- Score 80-89: Good writing quality with clear voice
- Score below 80: Adequate prose with room for improvement

RESPONSE FORMAT (NO MARKDOWN):

FICTION ANALYSIS:
World Summary: [Describe the fictional world and its key elements]
Character Assessment: [Evaluate the main characters and their development]
Thematic Elements: [Identify and assess the major themes]
Narrative Approach: [Analyze the story structure and pacing]

WORLD COHERENCE: [Score]/100
Assessment: [How consistent and believable is the world-building?]

EMOTIONAL PLAUSIBILITY: [Score]/100
Assessment: [How authentic are the emotional elements?]

THEMATIC DEPTH: [Score]/100
Assessment: [How meaningful and well-developed are the themes?]

NARRATIVE STRUCTURE: [Score]/100
Assessment: [How effective is the story construction?]

PROSE CONTROL: [Score]/100
Assessment: [How skillful is the writing craft?]

OVERALL FICTION SCORE: [Score]/100
Summary: [How effectively does this fiction construct a compelling reality?]

Fiction sample to assess:`;

function parseFictionAssessmentResponse(response: string): FictionAssessmentResult {
  // Use the enhanced cleanAIResponse function for aggressive markdown removal
  const cleanResponse = cleanAIResponse(response);

  const extractScore = (section: string): number => {
    const patterns = [
      // Handle ranges like "Score: 90-94"
      new RegExp(`${section}[:\\s]*Score:\\s*(\\d+)-(\\d+)`, 'i'),
      // Handle direct scores like "WORLD COHERENCE: 85/100"
      new RegExp(`${section}:\\s*(\\d+)/100`, 'i'),
      // Handle direct scores without /100
      new RegExp(`${section}:\\s*(\\d+)`, 'i'),
      // Handle "Score: X" format
      new RegExp(`Score:\\s*(\\d+)(?:/100)?`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = cleanResponse.match(pattern);
      if (match) {
        if (match[2]) {
          // Range format - take the middle value
          const low = parseInt(match[1]);
          const high = parseInt(match[2]);
          const score = Math.round((low + high) / 2);
          return Math.min(Math.max(score, 0), 100);
        } else {
          const score = parseInt(match[1]);
          return Math.min(Math.max(score, 0), 100);
        }
      }
    }
    
    // If score extraction fails, return a neutral score
    console.log(`Warning: Could not extract ${section} score from response`);
    return 75;
  };

  const worldCoherence = extractScore('WORLD COHERENCE');
  const emotionalPlausibility = extractScore('EMOTIONAL PLAUSIBILITY');
  const thematicDepth = extractScore('THEMATIC DEPTH');
  const narrativeStructure = extractScore('NARRATIVE STRUCTURE');
  const proseControl = extractScore('PROSE CONTROL');
  let overallFictionScore = extractScore('OVERALL FICTION SCORE');

  console.log('Parsed fiction scores:', {
    worldCoherence,
    emotionalPlausibility,
    thematicDepth,
    narrativeStructure,
    proseControl,
    overallFictionScore
  });

  // Consistency check for fiction scores
  const averageDimensionScore = Math.round((worldCoherence + emotionalPlausibility + thematicDepth + narrativeStructure + proseControl) / 5);
  
  if (overallFictionScore < averageDimensionScore - 10) {
    console.log(`Inconsistent fiction overall score detected: ${overallFictionScore} vs average dimensions: ${averageDimensionScore}. Using average.`);
    overallFictionScore = averageDimensionScore;
  }

  return {
    worldCoherence,
    emotionalPlausibility,
    thematicDepth,
    narrativeStructure,
    proseControl,
    overallFictionScore,
    detailedAssessment: cleanResponse
  };
}

async function makeOpenAIFictionRequest(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert fiction critic and literary analyst." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });
  
  return response.choices[0].message.content || "";
}

async function makeAnthropicFictionRequest(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : "";
}

async function makePerplexityFictionRequest(prompt: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: "You are an expert fiction critic and literary analyst." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }
  
  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function makeDeepSeekFictionRequest(prompt: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are an expert fiction critic and literary analyst." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }
  
  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function performFictionAssessment(text: string, provider: string): Promise<FictionAssessmentResult> {
  const prompt = FICTION_ASSESSMENT_PROMPT + "\n\n" + text;
  
  console.log(`Starting fiction assessment with ${provider} for text of length: ${text.length}`);
  
  try {
    let response: string;
    
    switch (provider) {
      case 'openai':
        response = await makeOpenAIFictionRequest(prompt);
        break;
      case 'anthropic':
        response = await makeAnthropicFictionRequest(prompt);
        break;
      case 'perplexity':
        response = await makePerplexityFictionRequest(prompt);
        break;
      case 'deepseek':
        response = await makeDeepSeekFictionRequest(prompt);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    const result = parseFictionAssessmentResponse(response);
    console.log(`Fiction assessment complete - Overall score: ${result.overallFictionScore}/100`);
    return result;
    
  } catch (error) {
    console.error(`Fiction assessment failed with ${provider}:`, error);
    throw new Error(`Fiction assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}