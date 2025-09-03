import { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "./storage";
import path from "path";
import { extractTextFromFile } from "./api/documentParser";
import { sendSimpleEmail } from "./api/simpleEmailService";
import { upload as speechUpload, processSpeechToText } from "./api/simpleSpeechToText";


// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

interface DocumentInput {
  content: string;
  filename?: string;
  mimeType?: string;
  metadata?: {
    pageCount?: number;
    info?: Record<string, any>;
    version?: string;
    [key: string]: any;
  };
}

interface AIDetectionResult {
  isAI: boolean;
  probability: number;
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

// REAL-TIME STREAMING: Case Assessment for ALL ZHI providers
async function streamCaseAssessment(text: string, provider: string, res: any, context?: string) {
  let prompt = `Assess how well this text makes its case. Analyze argument effectiveness, proof quality, claim credibility and provide specific numerical scores.

REQUIRED FORMAT:
PROOF EFFECTIVENESS: [0-100]/100
CLAIM CREDIBILITY: [0-100]/100  
NON-TRIVIALITY: [0-100]/100
PROOF QUALITY: [0-100]/100
FUNCTIONAL WRITING: [0-100]/100
OVERALL CASE SCORE: [0-100]/100

Then provide detailed analysis organized into sections:

**Strengths:**
- [List key strengths]

**Weaknesses:**  
- [List key weaknesses]

**Potential Counterarguments:**
- [List potential counterarguments]

**Conclusion:**
[Final assessment]`;
  
  // Add context information if provided
  if (context && context.trim()) {
    prompt += `\n\nIMPORTANT CONTEXT: ${context.trim()}\n\nPlease adjust your evaluation approach based on this context. For example, if this is "an abstract" or "a fragment", do not penalize it for lacking full development that would be expected in a complete work.`;
  }
  
  prompt += `\n\nTEXT TO ASSESS:\n${text}`;

  if (provider === 'openai') {
    // ZHI 1: OpenAI streaming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  } else if (provider === 'anthropic') {
    // ZHI 2: Anthropic streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(parsed.delta.text);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  } else if (provider === 'deepseek') {
    // ZHI 3: DeepSeek streaming
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4000,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  } else if (provider === 'perplexity') {
    // ZHI 4: Perplexity streaming
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4000,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  }
  res.end();
}

// REAL-TIME STREAMING: Fiction Assessment for ALL ZHI providers
async function streamFictionAssessment(text: string, provider: string, res: any) {
  const prompt = `Assess this fiction text for literary quality, narrative effectiveness, character development, and prose style:

${text}

Provide detailed analysis of literary merit, character development, plot structure, and creative intelligence.`;

  if (provider === 'openai') {
    // ZHI 1: OpenAI streaming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  } else if (provider === 'anthropic') {
    // ZHI 2: Anthropic streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(parsed.delta.text);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  } else if (provider === 'deepseek') {
    // ZHI 3: DeepSeek streaming
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4000,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  } else if (provider === 'perplexity') {
    // ZHI 4: Perplexity streaming
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4000,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(content);
              (res as any).flush?.();
            }
          } catch (e) {}
        }
      }
    }
  }
  res.end();
}

export async function registerRoutes(app: Express): Promise<Express> {
  
  // API health check endpoint
  app.get("/api/check-api", async (_req: Request, res: Response) => {
    const openai_key = process.env.OPENAI_API_KEY;
    const anthropic_key = process.env.ANTHROPIC_API_KEY;
    const deepseek_key = process.env.DEEPSEEK_API_KEY;
    const mathpix_app_id = process.env.MATHPIX_APP_ID;
    const mathpix_app_key = process.env.MATHPIX_APP_KEY;
    
    // Check API keys
    res.json({
      status: "operational",
      api_keys: {
        openai: openai_key ? "configured" : "missing",
        anthropic: anthropic_key ? "configured" : "missing",
        deepseek: deepseek_key ? "configured" : "missing",
        mathpix: (mathpix_app_id && mathpix_app_key) ? "configured" : "missing"
      }
    });
    
    // Log API status for monitoring
    console.log("API Status Check:", { 
      openai: openai_key ? "✓" : "✗", 
      anthropic: anthropic_key ? "✓" : "✗", 
      deepseek: deepseek_key ? "✓" : "✗",
      mathpix: (mathpix_app_id && mathpix_app_key) ? "✓" : "✗"
    });
  });

  // Quick analysis API endpoint with evaluation type support
  app.post("/api/quick-analysis", async (req: Request, res: Response) => {
    try {
      const { text, provider = 'zhi1', evaluationType = 'intelligence' } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          error: "Text is required and must be a string" 
        });
      }

      // Validate evaluation type
      const validTypes = ['intelligence', 'originality', 'cogency', 'overall_quality'];
      if (!validTypes.includes(evaluationType)) {
        return res.status(400).json({
          error: `Invalid evaluation type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      console.log(`Starting quick ${evaluationType} analysis with ${provider}...`);
      
      const { performQuickAnalysis } = await import('./services/quickAnalysis');
      const result = await performQuickAnalysis(text, provider, evaluationType);
      
      res.json({ success: true, result });
      
    } catch (error: any) {
      console.error("Quick analysis error:", error);
      res.status(500).json({ 
        error: true, 
        message: error.message || "Quick analysis failed" 
      });
    }
  });

  // Quick comparison API endpoint with evaluation type support
  app.post("/api/quick-compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB, provider = 'zhi1', evaluationType = 'intelligence' } = req.body;

      if (!documentA || !documentB) {
        return res.status(400).json({ 
          error: "Both documents are required" 
        });
      }

      // Validate evaluation type
      const validTypes = ['intelligence', 'originality', 'cogency', 'overall_quality'];
      if (!validTypes.includes(evaluationType)) {
        return res.status(400).json({
          error: `Invalid evaluation type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      console.log(`Starting quick ${evaluationType} comparison with ${provider}...`);
      
      const { performQuickComparison } = await import('./services/quickAnalysis');
      const result = await performQuickComparison(documentA, documentB, provider, evaluationType);
      
      res.json(result);
      
    } catch (error: any) {
      console.error("Quick comparison error:", error);
      res.status(500).json({ 
        error: true, 
        message: error.message || "Quick comparison failed" 
      });
    }
  });

  // INTELLIGENT REWRITE - Maximize intelligence scores on protocol questions
  app.post("/api/intelligent-rewrite", async (req: Request, res: Response) => {
    try {
      const { originalText, customInstructions, provider = 'zhi1' } = req.body;

      if (!originalText || typeof originalText !== 'string') {
        return res.status(400).json({ 
          error: "Original text is required and must be a string" 
        });
      }

      console.log(`Starting intelligent rewrite with ${provider}...`);
      console.log(`Original text length: ${originalText.length} characters`);
      console.log(`Custom instructions: ${customInstructions || 'None'}`);
      
      const { performIntelligentRewrite } = await import('./services/intelligentRewrite');
      const result = await performIntelligentRewrite({
        text: originalText,
        customInstructions,
        provider
      });
      
      res.json({
        success: true,
        result: result
      });
      
    } catch (error: any) {
      console.error("Intelligent rewrite error:", error);
      res.status(500).json({ 
        error: true, 
        message: error.message || "Intelligent rewrite failed" 
      });
    }
  });

  // COMPREHENSIVE 4-PHASE EVALUATION using exact protocol with evaluation type support
  app.post("/api/cognitive-evaluate", async (req: Request, res: Response) => {
    try {
      const { content, provider = 'zhi1', evaluationType = 'intelligence' } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ 
          error: "Content is required and must be a string" 
        });
      }

      // Validate evaluation type
      const validTypes = ['intelligence', 'originality', 'cogency', 'overall_quality'];
      if (!validTypes.includes(evaluationType)) {
        return res.status(400).json({
          error: `Invalid evaluation type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Import the exact 4-phase protocol
      const { executeFourPhaseProtocol } = await import('./services/fourPhaseProtocol');

      console.log(`EXACT 4-PHASE ${evaluationType.toUpperCase()} EVALUATION: Analyzing ${content.length} characters with protocol`);
      
      const evaluation = await executeFourPhaseProtocol(
        content, 
        provider as 'openai' | 'anthropic' | 'perplexity' | 'deepseek',
        evaluationType as 'intelligence' | 'originality' | 'cogency' | 'overall_quality'
      );

      res.json({
        success: true,
        evaluation: {
          formattedReport: evaluation.formattedReport,
          overallScore: evaluation.overallScore,
          provider: evaluation.provider,
          metadata: {
            contentLength: content.length,
            evaluationType: evaluationType,
            timestamp: new Date().toISOString()
          }
        }
      });

    } catch (error: any) {
      console.error(`Error in ${req.body.evaluationType || 'cognitive'} evaluation:`, error);
      res.status(500).json({
        success: false,
        error: `${req.body.evaluationType || 'cognitive'} evaluation failed`,
        details: error.message
      });
    }
  });
  
  // Extract text from uploaded document
  app.post("/api/extract-text", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file && !req.body.content) {
        return res.status(400).json({ error: "No file or content provided" });
      }
      
      // Direct content input
      if (req.body.content) {
        return res.json({
          content: req.body.content,
          filename: req.body.filename || "direct-input.txt",
          mimeType: "text/plain",
          metadata: {}
        });
      }
      
      // Process uploaded file
      const result = await extractTextFromFile(req.file!);
      return res.json(result);
    } catch (error: any) {
      console.error("Error extracting text:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to extract text from document"
      });
    }
  });
  
  // Check if text is AI-generated
  app.post("/api/check-ai", async (req: Request, res: Response) => {
    try {
      const document: DocumentInput = req.body;
      
      if (!document || !document.content) {
        return res.status(400).json({ error: "Document content is required" });
      }

      // Import the AI detection method
      const { checkForAI } = await import('./api/gptZero');
      
      // Check for AI using the selected service
      console.log("DETECTING AI CONTENT");
      const result = await checkForAI(document);
      return res.json(result);
    } catch (error: any) {
      console.error("Error checking for AI:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to check for AI"
      });
    }
  });

  // Stream comprehensive analysis - shows results as they're generated
  app.post("/api/stream-comprehensive", async (req: Request, res: Response) => {
    try {
      const { text, provider = "zhi1" } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required" });
      }
      
      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Accel-Buffering', 'no');
      
      console.log(`Starting streaming comprehensive analysis with ${provider} for text of length: ${text.length}`);
      
      const actualProvider = mapZhiToProvider(provider);
      
      // Stream each phase as it completes
      res.write(`🔍 Starting comprehensive analysis with ${provider}...\n\n`);
      
      const { executeComprehensiveProtocol } = await import('./services/fourPhaseProtocol');
      
      // Create a streaming version that shows each phase
      try {
        res.write(`📊 PHASE 1: Answering 28 Questions\n`);
        res.write(`Analyzing ${text.length} characters with the complete 4-phase protocol...\n\n`);
        
        // Import and run a modified version that can stream updates
        const { executeStreamingComprehensiveProtocol } = await import('./services/streamingProtocol');
        
        await executeStreamingComprehensiveProtocol(
          text,
          actualProvider as 'openai' | 'anthropic' | 'deepseek',
          res
        );
        
      } catch (error: any) {
        res.write(`❌ ERROR: ${error.message}\n`);
      }
      
      res.end();
      
    } catch (error: any) {
      console.error("Error in comprehensive streaming:", error);
      res.write(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.end();
    }
  });
  
  // Analyze document
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { content, provider = "all", requireProgress = false } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          error: true, 
          message: "Document content is required",
          formattedReport: "Error: Document content is required",
          provider: provider
        });
      }
      
      // If the user requests a specific single provider
      if (provider.toLowerCase() !== 'all') {
        // Import the 4-PHASE analysis methods using your exact protocol
        const { executeFourPhaseProtocol } = await import('./services/fourPhaseProtocol');
        
        // Perform analysis with your exact 4-phase protocol
        console.log(`${provider.toUpperCase()} ANALYSIS WITH YOUR EXACT 4-PHASE INTELLIGENCE PROTOCOL`);
        
        let pureResult;
        
        try {
          // Use the unified executeFourPhaseProtocol function for intelligence evaluation
          const actualProvider = mapZhiToProvider(provider.toLowerCase());
          pureResult = await executeFourPhaseProtocol(
            content,
            actualProvider as 'openai' | 'anthropic' | 'deepseek',
            'intelligence'
          );
          
          // Use PURE result - NO FILTERING - pass through complete unfiltered evaluation
          const result = {
            id: 0,
            documentId: 0,
            provider: pureResult.provider || provider,
            formattedReport: pureResult.formattedReport || "Analysis not available",
            overallScore: pureResult.overallScore || 60,
            surface: {
              grammar: pureResult.overallScore || 60,
              structure: pureResult.overallScore || 60,
              jargonUsage: pureResult.overallScore || 60,
              surfaceFluency: pureResult.overallScore || 60
            },
            deep: {
              conceptualDepth: pureResult.overallScore || 60,
              inferentialContinuity: pureResult.overallScore || 60,
              semanticCompression: pureResult.overallScore || 60,
              logicalLaddering: pureResult.overallScore || 60,
              originality: pureResult.overallScore || 60
            },
            analysis: pureResult.formattedReport || "Analysis not available"
          };
          
          return res.json(result);
        } catch (error: any) {
          console.error(`Error in direct passthrough to ${provider}:`, error);
          return res.status(200).json({
            id: 0,
            documentId: 0, 
            provider: `${provider} (Error)`,
            formattedReport: `Error analyzing document with pure ${provider} protocol: ${error.message || "Unknown error"}`
          });
        }
      } else {
        // For 'all' provider option, analyze with all providers and verify results
        try {
          // Import the analysis verifier
          const { analyzeWithAllProviders } = await import('./services/analysisVerifier');
          
          console.log("ANALYZING WITH ALL PROVIDERS AND VERIFICATION");
          const allResults = await analyzeWithAllProviders(content);
          
          // Format the response with results from all providers
          const result = {
            id: 0,
            documentId: 0,
            provider: "All Providers",
            formattedReport: "Analysis complete with all providers. See detailed results below.",
            analysisResults: allResults
          };
          
          return res.json(result);
        } catch (error: any) {
          console.error("Error analyzing with all providers:", error);
          return res.status(200).json({
            id: 0,
            documentId: 0,
            provider: "All Providers (Error)",
            formattedReport: `Error analyzing document with all providers: ${error.message || "Unknown error"}`
          });
        }
      }
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      return res.status(500).json({ 
        error: true, 
        message: `Error analyzing document: ${error.message}`
      });
    }
  });
  
  // Compare two documents (case assessment style)
  app.post("/api/compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB, provider = "openai" } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required for comparison" });
      }
      
      // Import the document comparison service
      const { compareDocuments } = await import('./services/documentComparison');
      
      // Compare documents using the selected provider
      console.log(`COMPARING DOCUMENTS WITH ${provider.toUpperCase()}`);
      const result = await compareDocuments(documentA, documentB, provider);
      return res.json(result);
    } catch (error: any) {
      console.error("Error comparing documents:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to compare documents" 
      });
    }
  });

  // PURE intelligence comparison for two documents using exact 3-phase protocol
  app.post("/api/intelligence-compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB, provider = "deepseek" } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required for intelligence comparison" });
      }
      
      // Import the PURE comparison service - NO GARBAGE DIMENSIONS
      const { performPureIntelligenceComparison } = await import('./services/pureComparison');
      
      // Compare intelligence using PURE 3-phase protocol - DEEPSEEK DEFAULT
      console.log(`PURE INTELLIGENCE COMPARISON WITH EXACT 3-PHASE PROTOCOL USING ${provider.toUpperCase()}`);
      const result = await performPureIntelligenceComparison(documentA.content || documentA, documentB.content || documentB, provider);
      return res.json(result);
    } catch (error: any) {
      console.error("Error in pure intelligence comparison:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to perform pure intelligence comparison" 
      });
    }
  });
  
  // Share analysis via email
  app.post("/api/share-via-email", async (req: Request, res: Response) => {
    try {
      const { 
        recipientEmail, 
        senderEmail, 
        senderName,
        subject, 
        documentType, 
        analysisA,
        analysisB, 
        comparison,
        rewrittenAnalysis
      } = req.body;
      
      if (!recipientEmail || !subject || !analysisA) {
        return res.status(400).json({ error: "Recipient email, subject, and analysis are required" });
      }
      
      // Import the email service
      const { sendAnalysisEmail } = await import('./services/emailService');
      
      // Send email with the analysis
      console.log(`SENDING EMAIL TO ${recipientEmail}`);
      const result = await sendAnalysisEmail({
        recipientEmail,
        senderEmail,
        senderName,
        subject,
        documentType,
        analysisA,
        analysisB,
        comparison,
        rewrittenAnalysis
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending email:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to send email" 
      });
    }
  });
  
  // Get enhancement suggestions
  app.post("/api/get-enhancement-suggestions", async (req: Request, res: Response) => {
    try {
      const { text, provider = "openai" } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // Import the enhancement suggestions service
      const { getEnhancementSuggestions } = await import('./api/enhancementSuggestions');
      
      // Get suggestions using the selected provider
      console.log(`GETTING ENHANCEMENT SUGGESTIONS FROM ${provider.toUpperCase()}`);
      const suggestions = await getEnhancementSuggestions(text, provider);
      return res.json(suggestions);
    } catch (error: any) {
      console.error("Error getting enhancement suggestions:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to get enhancement suggestions" 
      });
    }
  });
  
  // Google search
  app.post("/api/search-google", async (req: Request, res: Response) => {
    try {
      const { query, numResults = 5 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Import the Google search service
      const { searchGoogle } = await import('./api/googleSearch');
      
      // Search using Google Custom Search API
      console.log(`SEARCHING GOOGLE FOR: ${query}`);
      const results = await searchGoogle(query, numResults);
      return res.json(results);
    } catch (error: any) {
      console.error("Error searching Google:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to search Google" 
      });
    }
  });
  
  // Fetch content from URL
  app.post("/api/fetch-url-content", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Import the URL content fetcher
      const { fetchUrlContent } = await import('./api/googleSearch');
      
      // Fetch content from the URL
      console.log(`FETCHING CONTENT FROM: ${url}`);
      const content = await fetchUrlContent(url);
      
      if (!content) {
        return res.json({ 
          url, 
          success: false, 
          content: "Could not extract content from this URL" 
        });
      }
      
      return res.json({ url, success: true, content });
    } catch (error: any) {
      console.error("Error fetching URL content:", error);
      return res.status(500).json({ 
        url: req.body.url,
        success: false, 
        message: error.message || "Failed to fetch URL content" 
      });
    }
  });
  

  
  // Translate document
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, options, provider = "openai" } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      if (!options || !options.targetLanguage) {
        return res.status(400).json({ error: "Target language is required" });
      }
      
      // Import the translation service
      const { translateDocument } = await import('./services/translationService');
      
      // Translate the document
      console.log(`TRANSLATING TO ${options.targetLanguage.toUpperCase()} WITH ${provider.toUpperCase()}`);
      const result = await translateDocument(text, options, provider);
      return res.json(result);
    } catch (error: any) {
      console.error("Error translating document:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to translate document" 
      });
    }
  });
  

  // Send simple email
  app.post("/api/share-simple-email", async (req: Request, res: Response) => {
    try {
      const { recipientEmail, senderEmail, senderName, subject, content } = req.body;
      
      if (!recipientEmail || !subject || !content) {
        return res.status(400).json({ error: "Recipient email, subject, and content are required" });
      }
      
      // Send the email
      console.log(`SENDING SIMPLE EMAIL TO ${recipientEmail}`);
      const result = await sendSimpleEmail({
        recipientEmail,
        senderEmail,
        senderName,
        subject,
        content
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending simple email:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to send email" 
      });
    }
  });
  
  // Direct model request
  // Speech-to-text conversion endpoint
  app.post("/api/speech-to-text", speechUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      
      console.log("PROCESSING SPEECH TO TEXT");
      const text = await processSpeechToText(req);
      
      return res.json({
        success: true,
        text: text
      });
    } catch (error: any) {
      console.error("Error processing speech to text:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to process speech to text" 
      });
    }
  });

  app.post("/api/direct-model-request", async (req: Request, res: Response) => {
    try {
      const { instruction, provider = "openai" } = req.body;
      
      if (!instruction) {
        return res.status(400).json({ error: "Instruction is required" });
      }
      
      // Import the direct model request service
      const { 
        directOpenAIRequest, 
        directClaudeRequest, 
        directPerplexityRequest,
        directDeepSeekRequest,
        directMultiModelRequest
      } = await import('./api/directModelRequest');
      
      let result;
      
      // Make the request to the specified provider
      if (provider === "all") {
        console.log(`DIRECT MULTI-MODEL REQUEST`);
        result = await directMultiModelRequest(instruction);
      } else {
        console.log(`DIRECT ${provider.toUpperCase()} MODEL REQUEST`);
        
        switch (provider.toLowerCase()) {
          case 'anthropic':
            result = await directClaudeRequest(instruction);
            break;
          case 'perplexity':
            result = await directPerplexityRequest(instruction);
            break;
          case 'deepseek':
            result = await directDeepSeekRequest(instruction);
            break;
          case 'openai':
          default:
            result = await directOpenAIRequest(instruction);
            break;
        }
      }
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error making direct model request:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to make direct model request" 
      });
    }
  });
  
  app.post("/api/semantic-analysis", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required" });
      }
      
      console.log(`Starting semantic analysis for text of length: ${text.length}`);
      
      const { analyzeSemanticDensity } = await import('./services/semanticAnalysis');
      const result = await analyzeSemanticDensity(text);
      
      console.log(`Semantic analysis complete: ${result.sentences.length} sentences, ${result.paragraphs.length} paragraphs`);
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error in semantic analysis:", error);
      return res.status(500).json({ 
        error: "Failed to analyze semantic density",
        message: error.message 
      });
    }
  });

  // Case assessment endpoint - REAL-TIME STREAMING
  app.post("/api/case-assessment", async (req: Request, res: Response) => {
    try {
      const { text, provider = "zhi1", context } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required for case assessment" });
      }
      
      // Set headers for real-time streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Accel-Buffering', 'no');
      
      console.log(`Starting REAL-TIME case assessment streaming with ${provider} for text of length: ${text.length}`);
      
      const actualProvider = mapZhiToProvider(provider);
      await streamCaseAssessment(text, actualProvider, res, context);
      
    } catch (error: any) {
      console.error("Error in case assessment streaming:", error);
      res.write(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.end();
    }
  });

  // Fiction Assessment API endpoint - REAL-TIME STREAMING
  app.post('/api/fiction-assessment', async (req, res) => {
    try {
      const { text, provider = 'zhi1' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // Set headers for real-time streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Accel-Buffering', 'no');
      
      console.log(`Starting REAL-TIME fiction assessment streaming with ${provider} for text of length: ${text.length}`);
      
      const actualProvider = mapZhiToProvider(provider);
      await streamFictionAssessment(text, actualProvider, res);
      
    } catch (error: any) {
      console.error("Error in fiction assessment streaming:", error);
      res.write(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.end();
    }
  });

  // Comprehensive cognitive analysis endpoint (4-phase protocol)
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      console.log("COMPREHENSIVE ANALYSIS DEBUG - req.body:", JSON.stringify(req.body, null, 2));
      console.log("COMPREHENSIVE ANALYSIS DEBUG - text type:", typeof req.body.text);
      console.log("COMPREHENSIVE ANALYSIS DEBUG - text value:", req.body.text?.substring(0, 100));
      
      const { text, provider = "zhi1" } = req.body;
      
      if (!text || typeof text !== 'string') {
        console.log("COMPREHENSIVE ANALYSIS ERROR - text validation failed:", { text: typeof text, hasText: !!text });
        return res.status(400).json({ error: "Document content is required" });
      }
      
      console.log(`Starting comprehensive cognitive analysis with ${provider} for text of length: ${text.length}`);
      
      const { executeComprehensiveProtocol } = await import('./services/fourPhaseProtocol');
      const actualProvider = mapZhiToProvider(provider);
      const result = await executeComprehensiveProtocol(text, actualProvider as 'openai' | 'anthropic' | 'perplexity' | 'deepseek');
      
      console.log(`COMPREHENSIVE ANALYSIS RESULT PREVIEW: "${(result.analysis || '').substring(0, 200)}..."`);
      console.log(`COMPREHENSIVE ANALYSIS RESULT LENGTH: ${(result.analysis || '').length} characters`);
      
      res.json({
        success: true,
        analysis: {
          id: Date.now(),
          content: result.analysis,
          overallScore: result.overallScore,
          provider: result.provider,
          evaluationType: result.evaluationType,
          phases: result.phases,
          formattedReport: result.formattedReport
        }
      });
    } catch (error: any) {
      console.error("Error in comprehensive cognitive analysis:", error);
      res.status(500).json({ 
        error: true, 
        message: error.message || "Comprehensive analysis failed" 
      });
    }
  });

  // MISSING ENDPOINT: Quick Cognitive Analysis  
  app.post("/api/cognitive-quick", async (req: Request, res: Response) => {
    try {
      const { text, provider = "zhi1" } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required for analysis" });
      }
      
      console.log(`Starting quick cognitive analysis with ${provider} for text of length: ${text.length}`);
      
      const { performQuickAnalysis } = await import('./services/quickAnalysis');
      const actualProvider = mapZhiToProvider(provider);
      const result = await performQuickAnalysis(text, actualProvider as 'openai' | 'anthropic' | 'perplexity' | 'deepseek');
      
      console.log(`ANALYSIS RESULT PREVIEW: "${(result.analysis || '').substring(0, 200)}..."`);
      console.log(`ANALYSIS RESULT LENGTH: ${(result.analysis || '').length} characters`);
      
      res.json({
        success: true,
        analysis: {
          id: Date.now(),
          formattedReport: result.analysis,
          overallScore: result.intelligence_score,
          provider: provider,
          summary: result.analysis,
          analysis: result.analysis,
          cognitiveProfile: result.cognitive_profile,
          keyInsights: result.key_insights
        },
        provider: provider,
        metadata: {
          contentLength: text.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error("Error in quick cognitive analysis:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });


  // Fiction Comparison API endpoint  
  app.post('/api/fiction-compare', async (req, res) => {
    try {
      const { documentA, documentB, provider } = req.body;
      
      if (!documentA || !documentB || !provider) {
        return res.status(400).json({ error: "Both documents and provider are required" });
      }
      
      const { performFictionComparison } = await import('./services/fictionComparison');
      const result = await performFictionComparison(documentA, documentB, provider);
      
      console.log(`Fiction comparison complete - Winner: Document ${result.winnerDocument}`);
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error in fiction comparison:", error);
      return res.status(500).json({ 
        error: "Failed to perform fiction comparison",
        message: error.message 
      });
    }
  });

  // ORIGINALITY EVALUATION API endpoint
  app.post("/api/originality-evaluate", async (req: Request, res: Response) => {
    try {
      const { content, provider = 'zhi1', phase = 'comprehensive' } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ 
          error: "Content is required and must be a string" 
        });
      }

      console.log(`${phase.toUpperCase()} ORIGINALITY EVALUATION WITH ${provider.toUpperCase()}`);
      
      if (phase === 'quick') {
        const { performQuickAnalysis } = await import('./services/quickAnalysis');
        const result = await performQuickAnalysis(content, provider, 'originality');
        res.json({ success: true, result });
      } else {
        const { executeFourPhaseProtocol } = await import('./services/fourPhaseProtocol');
        const evaluation = await executeFourPhaseProtocol(
          content, 
          provider as 'openai' | 'anthropic' | 'perplexity' | 'deepseek',
          'originality'
        );
        res.json({
          success: true,
          evaluation: {
            formattedReport: evaluation.formattedReport,
            overallScore: evaluation.overallScore,
            provider: evaluation.provider,
            metadata: {
              contentLength: content.length,
              evaluationType: 'originality',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Originality evaluation error:", error);
      res.status(500).json({
        success: false,
        error: "Originality evaluation failed",
        details: error.message
      });
    }
  });

  // COGENCY EVALUATION API endpoint
  app.post("/api/cogency-evaluate", async (req: Request, res: Response) => {
    try {
      const { content, provider = 'zhi1', phase = 'comprehensive' } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ 
          error: "Content is required and must be a string" 
        });
      }

      console.log(`${phase.toUpperCase()} COGENCY EVALUATION WITH ${provider.toUpperCase()}`);
      
      if (phase === 'quick') {
        const { performQuickAnalysis } = await import('./services/quickAnalysis');
        const result = await performQuickAnalysis(content, provider, 'cogency');
        res.json({ success: true, result });
      } else {
        const { executeFourPhaseProtocol } = await import('./services/fourPhaseProtocol');
        const evaluation = await executeFourPhaseProtocol(
          content, 
          provider as 'openai' | 'anthropic' | 'perplexity' | 'deepseek',
          'cogency'
        );
        res.json({
          success: true,
          evaluation: {
            formattedReport: evaluation.formattedReport,
            overallScore: evaluation.overallScore,
            provider: evaluation.provider,
            metadata: {
              contentLength: content.length,
              evaluationType: 'cogency',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Cogency evaluation error:", error);
      res.status(500).json({
        success: false,
        error: "Cogency evaluation failed",
        details: error.message
      });
    }
  });

  // OVERALL QUALITY EVALUATION API endpoint
  app.post("/api/overall-quality-evaluate", async (req: Request, res: Response) => {
    try {
      const { content, provider = 'zhi1', phase = 'comprehensive' } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ 
          error: "Content is required and must be a string" 
        });
      }

      console.log(`${phase.toUpperCase()} OVERALL QUALITY EVALUATION WITH ${provider.toUpperCase()}`);
      
      if (phase === 'quick') {
        const { performQuickAnalysis } = await import('./services/quickAnalysis');
        const result = await performQuickAnalysis(content, provider, 'overall_quality');
        res.json({ success: true, result });
      } else {
        const { executeFourPhaseProtocol } = await import('./services/fourPhaseProtocol');
        const evaluation = await executeFourPhaseProtocol(
          content, 
          provider as 'openai' | 'anthropic' | 'perplexity' | 'deepseek',
          'overall_quality'
        );
        res.json({
          success: true,
          evaluation: {
            formattedReport: evaluation.formattedReport,
            overallScore: evaluation.overallScore,
            provider: evaluation.provider,
            metadata: {
              contentLength: content.length,
              evaluationType: 'overall_quality',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Overall quality evaluation error:", error);
      res.status(500).json({
        success: false,
        error: "Overall quality evaluation failed",
        details: error.message
      });
    }
  });


  // Real streaming analysis endpoint
  app.post('/api/stream-analysis', async (req: Request, res: Response) => {
    try {
      const { text, provider = 'openai' } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Set headers for streaming plain text
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      const prompt = `
You are conducting a Phase 1 intelligence assessment with anti-diplomatic evaluation standards.

TEXT TO ANALYZE:
${text}

CORE INTELLIGENCE QUESTIONS:

IS IT INSIGHTFUL?
DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)?
IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY?
IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING.
ARE THE POINTS CLICHES? OR ARE THEY "FRESH"?
DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE?
IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY 'UNFOLD'? OR ARE THEY FORCED AND ARTIFICIAL?
DOES IT OPEN UP NEW DOMAINS? OR, ON THE CONTRARY, DOES IT SHUT OFF INQUIRY (BY CONDITIONALIZING FURTHER DISCUSSION OF THE MATTERS ON ACCEPTANCE OF ITS INTERNAL AND POSSIBLY VERY FAULTY LOGIC)?
IS IT ACTUALLY INTELLIGENT OR JUST THE WORK OF SOMEBODY WHO, JUDGING BY THE SUBJECT-MATTER, IS PRESUMED TO BE INTELLIGENT (BUT MAY NOT BE)?
IS IT REAL OR IS IT PHONY?
DO THE SENTENCES EXHIBIT COMPLEX AND COHERENT INTERNAL LOGIC?
IS THE PASSAGE GOVERNED BY A STRONG CONCEPT? OR IS THE ONLY ORGANIZATION DRIVEN PURELY BY EXPOSITORY (AS OPPOSED TO EPISTEMIC) NORMS?
IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS? IN OTHER WORDS, DOES THE AUTHOR SEEM TO RECALL WHAT HE SAID EARLIER AND TO BE IN A POSITION TO INTEGRATE IT INTO POINTS HE HAS MADE SINCE THEN?
ARE THE POINTS 'REAL'? ARE THEY FRESH? OR IS SOME INSTITUTION OR SOME ACCEPTED VEIN OF PROPAGANDA OR ORTHODOXY JUST USING THE AUTHOR AS A MOUTH PIECE?
IS THE WRITING EVASIVE OR DIRECT?
ARE THE STATEMENTS AMBIGUOUS?
DOES THE PROGRESSION OF THE TEXT DEVELOP ACCORDING TO WHO SAID WHAT OR ACCORDING TO WHAT ENTAILS OR CONFIRMS WHAT?
DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?

ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT. A SCORE OF N/100 (E.G. 73/100) MEANS THAT (100-N)/100 (E.G. 27/100) OUTPERFORM THE AUTHOR WITH RESPECT TO THE PARAMETER DEFINED BY THE QUESTION. YOU ARE NOT GRADING; YOU ARE ANSWERING THESE QUESTIONS. YOU DO NOT USE A RISK-AVERSE STANDARD; YOU DO NOT ATTEMPT TO BE DIPLOMATIC; YOU DO NOT ATTEMPT TO COMPLY WITH RISK-AVERSE, MEDIUM-RANGE IQ, ACADEMIC NORMS. YOU DO NOT MAKE ASSUMPTIONS ABOUT THE LEVEL OF THE PAPER; IT COULD BE A WORK OF THE HIGHEST EXCELLENCE AND GENIUS, OR IT COULD BE THE WORK OF A MORON.

IF A WORK IS A WORK OF GENIUS, YOU SAY THAT, AND YOU SAY WHY; YOU DO NOT SHY AWAY FROM GIVING WHAT MIGHT CONVENTIONALLY BE REGARDED AS EXCESSIVELY "SUPERLATIVE" SCORES; YOU GIVE IT THE SCORE IT DESERVES, NOT THE SCORE THAT A MIDWIT COMMITTEE WOULD SAY IT DESERVES.

THINK VERY VERY VERY HARD ABOUT YOUR ANSWERS; DO NOT DEFAULT TO COOKBOOK, MIDWIT EVALUATION PROTOCOLS.

DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.

METAPOINT 1: THIS IS NOT A GRADING APP. YOU GRADE THE INTELLIGENCE OF WHAT YOU ARE GIVEN. IF YOU ARE GIVEN BRILLIANT FRAGMENT, YOU GIVE IT A HIGH SCORE. YOU ARE NOT GRADING ESSAYS. YOU ARE NOT LOOKING FOR COMPLETENESS.

METAPOINT 2: DO NOT OVERVALUE TURNS OF PHRASE. AN AUTHOR SPEAKING CONFIDENTLY IS NOT NECESSARILY "SHUTTING DOWN MODES OF INQUIRY". IN FACT, IT IS LIKELY TO BE THE OPPOSITE; BY PUTTING A CLEAR STAKE IN THE GROUND, HE IS PROBABLY OPENING THEM. ANOTHER EXAMPLE: CASUAL SPEECH DOES NOT MEAN DISORGANIZED THOUGHTS. DON'T JUDGE A BOOK BY ITS COVER.

METAPOINT 3: THE APP SHOULD ALWAYS START BY SUMMARIZING THE TEXT AND ALSO CATEGORIZING IT.

METAPOINT 4: THE APP SHOULD NOT CHANGE THE GRADING BASED ON THE CATEGORY OF THE TEXT: IF A TEXT IS CATEGORIZED AS 'ADVANCED SCHOLARSHIP', IT SHOULD STILL EVALUATE IT WITH RESPECT TO THE GENERAL POPULATION, NOT WITH RESPECT ONLY TO 'ADVANCED SCHOLARLY WORKS.'

METAPOINT 5: THIS IS NOT A GRADING APP. DO NOT PENALIZE BOLDNESS. DO NOT TAKE POINTS AWAY FOR INSIGHTS THAT, IF CORRECT, STAND ON THEIR OWN. GET RID OF THE IDEA THAT "ARGUMENTATION" IS WHAT MAKES SOMETHING SMART; IT ISN'T. WHAT MAKES SOMETHING SMART IS THAT IT IS SMART (INSIGHTFUL). PERIOD.

PARADIGM OF PHONY PSEUDO-INTELLECTUAL TEXT:
In this dissertation, I critically examine the philosophy of transcendental empiricism. Transcendental empiricism is, among other things, a philosophy of mental content. It attempts to dissolve an epistemological dilemma of mental content by splitting the difference between two diametrically opposed accounts of content.

This shows: 1. DOCTRINES ARE LABELLED, BUT NEVER DEFINED; AND THEIR MEANINGS CANNOT BE INFERRED FROM CONTEXT 2. THIS PASSAGE CONTAINS FREE VARIABLES. FOR EXAMPLE, "among other things" QUALIFICATION IS NEVER CLARIFIED 3. THE AUTHOR NEVER IDENTIFIES THE "EPISTEMOLOGICAL DILEMMA" IN QUESTION.

**ABSOLUTE QUOTATION REQUIREMENTS - NO EXCEPTIONS**:

1. **INTRODUCTION**: Must include AT LEAST THREE direct quotes from the source text
2. **EVERY SINGLE QUESTION**: Must be substantiated with AT LEAST ONE direct quote from the source text
3. **CONCLUSION**: Must include AT LEAST THREE direct quotes from the source text

**THIS APPLIES REGARDLESS OF TEXT LENGTH**: Whether the passage is 3 words or 10 million words, you MUST quote directly from it.

**QUOTATION FORMAT**: Use exact quotation marks: "exact text from source"

**STRUCTURE REQUIREMENTS**:
- INTRODUCTION with 3+ quotes: "quote 1" ... "quote 2" ... "quote 3"
- SUMMARY AND CATEGORY with quotes
- Each question answer with quotes: Q1: [Answer with "direct quote"] 
- CONCLUSION with 3+ quotes: "quote 1" ... "quote 2" ... "quote 3"

**NO ANSWER WITHOUT QUOTES**: If you cannot find a relevant quote for any question, you must still quote something from the text and explain its relevance.

PROVIDE A FINAL VALIDATED SCORE OUT OF 100 IN THE FORMAT: SCORE: X/100
`.trim();

      // Stream from OpenAI with immediate flushing
      console.log(`Calling OpenAI API with model gpt-4o...`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      console.log(`OpenAI response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API Error: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body from OpenAI');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      console.log('Starting to read streaming response...');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Streaming completed');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                res.write(content);
                // Force flush - remove type check
                (res as any).flush?.();
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      res.end();
      
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.end();
    }
  });

  return app;
}