import { executeFourPhaseProtocol } from './fourPhaseProtocol';

type LLMProvider = 'openai' | 'anthropic' | 'perplexity' | 'deepseek';

interface IntelligentRewriteRequest {
  text: string;
  customInstructions?: string;
  provider: LLMProvider;
}

interface IntelligentRewriteResult {
  originalText: string;
  rewrittenText: string;
  originalScore: number;
  rewrittenScore: number;
  provider: string;
  instructions: string;
  rewriteReport: string;
}

// Map ZHI names to actual provider names
function mapZhiToProvider(zhiName: string): string {
  const mapping: Record<string, string> = {
    'zhi1': 'openai',
    'zhi2': 'anthropic', 
    'zhi3': 'deepseek',
  };
  return mapping[zhiName] || zhiName;
}

export async function performIntelligentRewrite(request: IntelligentRewriteRequest): Promise<IntelligentRewriteResult> {
  const { text, customInstructions, provider: rawProvider } = request;
  const provider = mapZhiToProvider(rawProvider) as LLMProvider;
  
  console.log(`Starting intelligent rewrite with ${provider}`);
  
  // Step 1: Get baseline score using 4-phase protocol
  console.log('Step 1: Evaluating original text...');
  const originalEvaluation = await executeFourPhaseProtocol(text, provider);
  const originalScore = originalEvaluation.overallScore;
  
  console.log(`Original score: ${originalScore}/100`);
  
  // Step 2: Create rewrite instructions
  const defaultInstructions = `You are rewriting text to score 98-100/100 on a sophisticated 4-phase intelligence evaluation. This evaluation specifically looks for:

CRITICAL SUCCESS FACTORS (what scores 95-100):
1. NOVEL ABSTRACTION: Introduce genuinely new conceptual distinctions or frameworks that weren't obvious before
2. INFERENTIAL CONTROL: Make every logical step crystal clear with explicit reasoning chains 
3. SEMANTIC COMPRESSION: Pack maximum meaning into minimal words - every sentence must carry heavy conceptual load
4. RECURSIVE STRUCTURE: Create arguments that loop back and strengthen themselves (A supports B supports C supports A*)
5. OPERATIONAL PRECISION: Define terms with surgical precision - no vague concepts allowed
6. HIERARCHICAL ORGANIZATION: Clear logical progression from foundation to implications
7. COGNITIVE RISK: Make bold, non-obvious claims that require sophisticated reasoning to defend

SPECIFIC REWRITE TACTICS:
- Add explicit "because" and "therefore" chains showing logical connections
- Introduce precise technical distinctions (like "presentations vs representations")
- Create nested logical structures where each point builds on and reinforces others
- Use precise philosophical/technical language where it adds conceptual clarity
- Make implicit assumptions explicit and defend them
- Show how conclusions loop back to strengthen premises
- Add brief explanations of why obvious alternatives fail

PRESERVE: Core arguments, conclusions, overall thesis
ENHANCE: Logical rigor, conceptual precision, inferential transparency`;

  const finalInstructions = customInstructions 
    ? `${defaultInstructions}\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${customInstructions}\n\nNote: Balance custom instructions with the intelligence optimization criteria above.`
    : defaultInstructions;

  // Step 3: Perform the rewrite
  console.log('Step 2: Performing intelligent rewrite...');
  const rewritePrompt = `${finalInstructions}

ORIGINAL TEXT:
${text}

CRITICAL: Output ONLY the rewritten text. NO commentary, NO explanations, NO preamble like "Here's a rewrite..." Just the pure rewritten text starting immediately.

REWRITTEN TEXT:`;

  let rewrittenText: string;
  try {
    // Use the same LLM call pattern as other services
    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: rewritePrompt }],
        temperature: 0.1
      });
      
      rewrittenText = completion.choices[0]?.message?.content || '';
      
      // Strip out AI commentary bullshit  
      rewrittenText = rewrittenText
        .replace(/^Here's.*?rewrite.*?:/i, '')
        .replace(/^This.*?version.*?:/i, '')
        .replace(/^The following.*?:/i, '')
        .replace(/^Below.*?:/i, '')
        .replace(/^\*\*.*?\*\*:?/gm, '')
        .replace(/^--+/gm, '')
        .trim();
    } else if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{ role: "user", content: rewritePrompt }],
        temperature: 0.1
      });
      
      rewrittenText = completion.content[0]?.type === 'text' ? completion.content[0].text : '';
      
      // Strip out AI commentary bullshit
      rewrittenText = rewrittenText
        .replace(/^Here's.*?rewrite.*?:/i, '')
        .replace(/^This.*?version.*?:/i, '')
        .replace(/^The following.*?:/i, '')
        .replace(/^Below.*?:/i, '')
        .replace(/^\*\*.*?\*\*:?/gm, '')
        .replace(/^--+/gm, '')
        .trim();
    } else if (provider === 'perplexity') {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: rewritePrompt }],
          temperature: 0.1
        })
      });
      
      const data = await response.json();
      rewrittenText = data.choices[0]?.message?.content || '';
    } else if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: rewritePrompt }],
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      
      const data = await response.json();
      rewrittenText = data.choices[0]?.message?.content || '';
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error during rewrite with ${provider}:`, error);
    throw new Error(`Rewrite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 4: Evaluate the rewritten text
  console.log('Step 3: Evaluating rewritten text...');
  const rewrittenEvaluation = await executeFourPhaseProtocol(rewrittenText, provider);
  const rewrittenScore = rewrittenEvaluation.overallScore;
  
  console.log(`Rewritten score: ${rewrittenScore}/100`);
  console.log(`Score improvement: ${rewrittenScore - originalScore} points`);
  
  // Step 5: Generate rewrite report
  const improvementType = rewrittenScore > originalScore ? 'improvement' : 
                         rewrittenScore < originalScore ? 'regression' : 'no change';
  
  const rewriteReport = `Intelligent Rewrite Analysis:

Original Score: ${originalScore}/100
Rewritten Score: ${rewrittenScore}/100
Change: ${rewrittenScore > originalScore ? '+' : ''}${rewrittenScore - originalScore} points (${improvementType})

Provider: ${provider}
Instructions: ${customInstructions || 'Default intelligence optimization'}

The rewrite ${improvementType === 'improvement' ? 'successfully enhanced' : 
             improvementType === 'regression' ? 'unfortunately decreased' : 'maintained'} 
the text's intelligence evaluation score through ${improvementType === 'improvement' ? 'strategic structural and logical improvements' : 
                                                  improvementType === 'regression' ? 'changes that may have disrupted the original logical flow' :
                                                  'modifications that preserved the original intellectual level'}.`;

  return {
    originalText: text,
    rewrittenText,
    originalScore,
    rewrittenScore,
    provider,
    instructions: customInstructions || 'Default intelligence optimization',
    rewriteReport
  };
}