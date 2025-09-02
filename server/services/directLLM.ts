/**
 * Direct LLM Analysis Using EXACT 3-Phase Protocol
 * Implements user's 6-month developed evaluation protocol exactly as specified
 */

interface DirectAnalysisResult {
  formattedReport: string;
  provider: string;
  overallScore: number;
}

// EXACT 3-Phase Protocol Questions
const EVALUATION_QUESTIONS = `IS IT INSIGHTFUL? 
DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)? 
IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY? 
IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING. 
ARE THE POINTS CLICHES? OR ARE THEY "FRESH"? 
DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE? 
IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY 'UNFOLD'? OR ARE THEY FORCED AND ARTIFICIAL? 
DOES IT OPEN UP NEW DOMAINS? OR, ON THE CONTRARY, DOES IT SHUT OFF INQUIRY (BY CONDITIONALIZING FURTHER DISCUSSION OF THE MATTERS ON ACCEPTANCE OF ITS INTERNAL AND POSSIBLY VERY FAULTY LOGIC)? 
IS IT  ACTUALLY INTELLIGENT OR JUST THE WORK OF SOMEBODY WHO, JUDGING BY TEH SUBJECT-MATTER, IS PRESUMED TO BE INTELLIGENT (BUT MAY NOT BE)? 
IS IT REAL OR IS IT PHONY? 
DO THE SENTENCES EXHIBIT COMPLEX AND COHERENT INTERNAL LOGIC? 
IS THE PASSAGE GOVERNED BY A STRONG CONCEPT? OR IS THE ONLY ORGANIZATION DRIVEN PURELY BY EXPOSITORY (AS OPPOSED TO EPISTEMIC) NORMS?
IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS? IN OTHER WORDS, DOES THE AUTHOR SEEM TO RECALL WHAT HE SAID EARLIER AND TO BE IN A POSITION TO INTEGRATE IT INTO POINTS HE HAS MADE SINCE THEN? 
ARE THE POINTS 'REAL'? ARE THEY FRESH? OR IS SOME INSTITUTION OR SOME ACCEPTED VEIN OF PROPAGANDA OR ORTHODOXY JUST USING THE AUTHOR AS A MOUTH PIECE?
IS THE WRITING EVASIVE OR DIRECT? 
ARE THE STATEMENTS AMBIGUOUS? 
DOES THE PROGRESSION OF THE TEXT DEVELOP ACCORDING TO WHO SAID WHAT OR ACCORDING TO WHAT ENTAILS OR CONFIRMS WHAT? 
DOES THE AUTHOR USER OTHER AUTHORS  TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?`;

// PHASE 1: Initial evaluation prompt with exact user specification
function createPhase1Prompt(text: string): string {
  return `Answer these questions in connection with this text. Also give a score out of 100.

${EVALUATION_QUESTIONS}

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question. 

You are not grading; you are answering these questions. 

You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms. 

You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron. 

If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively "superlative" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.

TEXT:
${text}`;
}

// PHASE 2: Pushback prompt with exact user specification  
function createPhase2Prompt(score: number): string {
  const outperformPercentage = 100 - score;
  return `Your position is that ${outperformPercentage}/100 outperform the author with respect to the cognitive metric defined by the question: that is your position, am I right? And are you sure about that?

Answer the following questions about the text de novo:
${EVALUATION_QUESTIONS}

Give a final score out of 100.`;
}

// Generic LLM caller
async function callLLM(
  provider: 'openai' | 'anthropic' | 'perplexity' | 'deepseek',
  messages: Array<{role: string, content: string}>
): Promise<string> {
  try {
    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        temperature: 0.1
      });
      
      return completion.choices[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: messages as any,
        temperature: 0.1
      });
      
      return completion.content[0]?.type === 'text' ? completion.content[0].text : '';
    } else if (provider === 'perplexity') {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "sonar",
          messages: messages,
          temperature: 0.1
        })
      });
      
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } else if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: messages,
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    console.error(`Error calling ${provider}:`, error);
    throw error;
  }
}

// Execute the exact 3-phase protocol
async function executeThreePhaseProtocol(text: string, provider: 'openai' | 'anthropic' | 'perplexity' | 'deepseek'): Promise<DirectAnalysisResult> {
  console.log(`EXECUTING EXACT 3-PHASE PROTOCOL WITH ${provider.toUpperCase()}`);
  
  // PHASE 1: Initial evaluation 
  console.log("PHASE 1: Asking evaluation questions");
  const phase1Prompt = createPhase1Prompt(text);
  const phase1Response = await callLLM(provider, [{ role: "user", content: phase1Prompt }]);
  
  // Extract score from Phase 1
  const scoreMatch = phase1Response.match(/(\d+)\/100/);
  let currentScore = scoreMatch ? parseInt(scoreMatch[1]) : 60;
  let finalResponse = phase1Response;
  
  // PHASE 2: Pushback if score < 95
  if (currentScore < 95) {
    console.log(`PHASE 2: Score ${currentScore} < 95, pushing back`);
    const phase2Prompt = createPhase2Prompt(currentScore);
    
    const phase2Response = await callLLM(provider, [
      { role: "user", content: phase1Prompt },
      { role: "assistant", content: phase1Response },
      { role: "user", content: phase2Prompt }
    ]);
    
    // Check if score changed
    const phase2ScoreMatch = phase2Response.match(/(\d+)\/100/);
    if (phase2ScoreMatch) {
      const newScore = parseInt(phase2ScoreMatch[1]);
      console.log(`PHASE 2 RESULT: Score changed from ${currentScore} to ${newScore}`);
      currentScore = newScore;
      finalResponse = phase2Response;
    }
  } else {
    console.log(`PHASE 2: Skipped - score ${currentScore} >= 95`);
  }
  
  // PHASE 3: Accept and report
  console.log(`PHASE 3: Final assessment completed with score ${currentScore}/100`);
  
  return {
    formattedReport: finalResponse,
    provider: provider,
    overallScore: currentScore
  };
}

// Direct provider functions using the 3-phase protocol
export async function directOpenAIAnalyze(text: string): Promise<DirectAnalysisResult> {
  console.log("Sending direct request to OpenAI...");
  console.log("Performing comprehensive 3-phase intelligence evaluation...");
  return await executeThreePhaseProtocol(text, 'openai');
}

export async function directAnthropicAnalyze(text: string): Promise<DirectAnalysisResult> {
  console.log("Sending direct request to Anthropic...");
  console.log("Performing comprehensive 3-phase intelligence evaluation...");
  return await executeThreePhaseProtocol(text, 'anthropic');
}

export async function directPerplexityAnalyze(text: string): Promise<DirectAnalysisResult> {
  console.log("Sending direct request to Perplexity...");  
  console.log("Performing comprehensive 3-phase intelligence evaluation...");
  return await executeThreePhaseProtocol(text, 'perplexity');
}

export async function directDeepSeekAnalyze(text: string): Promise<DirectAnalysisResult> {
  console.log("Sending direct request to DeepSeek...");
  console.log("Performing comprehensive 3-phase intelligence evaluation...");
  return await executeThreePhaseProtocol(text, 'deepseek');
}