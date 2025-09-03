import React, { useState, useEffect } from "react";
import ModeToggle from "@/components/ModeToggle";
import DocumentInput from "@/components/DocumentInput";
import DocumentResults from "@/components/DocumentResults";
import ComparativeResults from "@/components/ComparativeResults";
import AIDetectionModal from "@/components/AIDetectionModal";
import ProviderSelector, { LLMProvider } from "@/components/ProviderSelector";

import ChatDialog from "@/components/ChatDialog";
import SemanticDensityAnalyzer from "@/components/SemanticDensityAnalyzer";
import CaseAssessmentModal from "@/components/CaseAssessmentModal";
import { DocumentComparisonModal } from "@/components/DocumentComparisonModal";
import { FictionAssessmentModal } from "@/components/FictionAssessmentModal";
import { FictionComparisonModal } from "@/components/FictionComparisonModal";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Trash2, FileEdit, Loader2, Zap, Clock, Sparkles, Download } from "lucide-react";
import { analyzeDocument, compareDocuments, checkForAI } from "@/lib/analysis";
import { AnalysisMode, DocumentInput as DocumentInputType, AIDetectionResult, DocumentAnalysis, DocumentComparison } from "@/lib/types";

const HomePage: React.FC = () => {
  // State for analysis mode
  const [mode, setMode] = useState<AnalysisMode>("single");
  
  // State for analysis type (quick vs comprehensive)
  const [analysisType, setAnalysisType] = useState<"quick" | "comprehensive">("quick");

  // State for document inputs
  const [documentA, setDocumentA] = useState<DocumentInputType>({ content: "" });
  const [documentB, setDocumentB] = useState<DocumentInputType>({ content: "" });

  // State for analysis results
  const [analysisA, setAnalysisA] = useState<DocumentAnalysis | null>(null);
  const [analysisB, setAnalysisB] = useState<DocumentAnalysis | null>(null);
  const [comparison, setComparison] = useState<DocumentComparison | null>(null);



  // State for loading indicators
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isAICheckLoading, setIsAICheckLoading] = useState(false);

  // State for showing results section
  const [showResults, setShowResults] = useState(false);

  // State for AI detection
  const [aiDetectionModalOpen, setAIDetectionModalOpen] = useState(false);
  const [currentAICheckDocument, setCurrentAICheckDocument] = useState<"A" | "B">("A");
  const [aiDetectionResult, setAIDetectionResult] = useState<AIDetectionResult | undefined>(undefined);


  
  // State for case assessment
  const [caseAssessmentModalOpen, setCaseAssessmentModalOpen] = useState(false);
  const [caseAssessmentResult, setCaseAssessmentResult] = useState<any>(null);
  const [isCaseAssessmentLoading, setIsCaseAssessmentLoading] = useState(false);
  
  // State for document comparison
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  
  // State for fiction assessment
  const [fictionAssessmentModalOpen, setFictionAssessmentModalOpen] = useState(false);
  const [fictionComparisonModalOpen, setFictionComparisonModalOpen] = useState(false);
  const [currentFictionDocument, setCurrentFictionDocument] = useState<"A" | "B">("A");
  const [isFictionAssessmentLoading, setIsFictionAssessmentLoading] = useState(false);
  const [fictionAssessmentResult, setFictionAssessmentResult] = useState<any>(null);

  // State for maximize intelligence feature
  const [maximizeIntelligenceModalOpen, setMaximizeIntelligenceModalOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [isMaximizeIntelligenceLoading, setIsMaximizeIntelligenceLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<string>("");
  const [rewriteResultsModalOpen, setRewriteResultsModalOpen] = useState(false);
  const [rewriteResultData, setRewriteResultData] = useState<any>(null);
  
  
  // Streaming state for real-time analysis
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Default instructions for maximize intelligence
  const defaultInstructions = `REWRITE IN SUCH THAT THE RESULTING DOCUMENT SCORES MAXIMALLY HIGH ON EACH OF THE FOLLOWING QUESTIONS (SO FAR AS THAT IS POSSIBLE WITHOUT TOTALLY CHANGING THE CONTENT), THE QUESTIONS IN QUESTION BEING:

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
DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?`;
  
  // State for LLM provider
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("zhi1");

  // FIXED streaming function
  const startStreaming = async (text: string, provider: string) => {
    console.log('startStreaming called with:', { text: text.slice(0, 50), provider });
    
    try {
      console.log('Making fetch request to /api/stream-analysis...');
      
      const response = await fetch('/api/stream-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, provider }),
      });

      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log('Starting to read stream...');
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream ended');
          setIsStreaming(false);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk);
        
        if (chunk) {
          setStreamingContent(prev => {
            const newContent = prev + chunk;
            console.log('Updated content length:', newContent.length);
            return newContent;
          });
        }
      }
      
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingContent('ERROR: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsStreaming(false);
    }
  };
  const [apiStatus, setApiStatus] = useState<{
    openai: boolean;
    anthropic: boolean;
    perplexity: boolean;
    deepseek: boolean;
  }>({
    openai: false,
    anthropic: false,
    perplexity: false,
    deepseek: false
  });
  
  // Check API status when component mounts
  useEffect(() => {
    async function checkApiStatus() {
      try {
        const response = await fetch("/api/check-api");
        const data = await response.json();
        
        if (data.api_keys) {
          setApiStatus({
            openai: data.api_keys.openai === "configured",
            anthropic: data.api_keys.anthropic === "configured",
            perplexity: data.api_keys.perplexity === "configured",
            deepseek: data.api_keys.deepseek === "configured"
          });
          
          console.log("API Status:", data.api_keys);
        }
      } catch (error) {
        console.error("Error checking API status:", error);
      }
    }
    
    checkApiStatus();
  }, []);

  // Handler for checking if a document is AI-generated
  const handleCheckAI = async (documentId: "A" | "B") => {
    const document = documentId === "A" ? documentA : documentB;
    
    if (!document.content.trim()) {
      alert("Please enter some text before checking for AI.");
      return;
    }

    setCurrentAICheckDocument(documentId);
    setAIDetectionModalOpen(true);
    setIsAICheckLoading(true);
    setAIDetectionResult(undefined);

    try {
      const result = await checkForAI(document);
      setAIDetectionResult(result);
      
      // Update the document analysis with AI detection results if it exists
      if (documentId === "A" && analysisA) {
        setAnalysisA({
          ...analysisA,
          aiDetection: result
        });
      } else if (documentId === "B" && analysisB) {
        setAnalysisB({
          ...analysisB,
          aiDetection: result
        });
      }
    } catch (error) {
      console.error("Error checking for AI:", error);
    } finally {
      setIsAICheckLoading(false);
    }
  };

  // Handler for case assessment - REAL-TIME STREAMING
  const handleCaseAssessment = async () => {
    if (!documentA.content.trim()) {
      alert("Please enter some text to assess how well it makes its case.");
      return;
    }

    // Check if the selected provider is available (map ZHI names to original API names)
    const apiKeyMapping: Record<string, string> = {
      'zhi1': 'openai',
      'zhi2': 'anthropic', 
      'zhi3': 'deepseek',

    };
    const actualApiKey = apiKeyMapping[selectedProvider] || selectedProvider;
    if (selectedProvider !== "all" && !apiStatus[actualApiKey as keyof typeof apiStatus]) {
      alert(`The ${selectedProvider} API key is not configured or is invalid. Please select a different provider or ensure the API key is properly set.`);
      return;
    }

    // Reset any previous streaming state and clear previous analysis results
    setIsStreaming(false);
    setStreamingContent('');
    setAnalysisA(null); // Clear previous intelligence analysis
    setShowResults(true); // Ensure results section is visible
    
    // Start REAL-TIME streaming for case assessment
    setIsStreaming(true);
    setIsCaseAssessmentLoading(true);
    setCaseAssessmentResult(null);

    try {
      const provider = selectedProvider === "all" ? "zhi1" : selectedProvider;
      
      const response = await fetch('/api/case-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: documentA.content,
          provider: provider,
          context: documentA.context
        }),
      });

      if (!response.ok) {
        throw new Error(`Case assessment failed: ${response.statusText}`);
      }

      // REAL-TIME STREAMING: Read response token by token
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setStreamingContent(fullResponse); // Show each token as it arrives
      }

      // Parse the case assessment response to extract scores
      const parseScores = (text: string) => {
        const extractScore = (pattern: string): number => {
          const regex = new RegExp(`${pattern}[:\\s]*(\\d+)(?:/100)?`, 'i');
          const match = text.match(regex);
          return match ? parseInt(match[1]) : 0;
        };

        return {
          proofEffectiveness: extractScore('PROOF EFFECTIVENESS'),
          claimCredibility: extractScore('CLAIM CREDIBILITY'),
          nonTriviality: extractScore('NON-TRIVIALITY'),
          proofQuality: extractScore('PROOF QUALITY'),
          functionalWriting: extractScore('FUNCTIONAL WRITING'),
          overallCaseScore: extractScore('OVERALL CASE SCORE'),
          detailedAssessment: fullResponse
        };
      };

      const caseAssessmentData = parseScores(fullResponse);
      setCaseAssessmentResult(caseAssessmentData);
      
      // CREATE CASE ASSESSMENT ONLY RESULT - NOT INTELLIGENCE ASSESSMENT  
      setAnalysisA({
        id: Date.now(),
        formattedReport: "", // Empty so it doesn't show in intelligence section
        overallScore: undefined, // No intelligence score
        provider: provider,
        analysis: "",
        summary: "",
        caseAssessment: caseAssessmentData,
        analysisType: "case_assessment", // Flag to identify this as case assessment
      });
      
      // NO POPUP - Results are now in main report only
      
    } catch (error) {
      console.error("Error performing case assessment:", error);
      alert("Failed to assess document case. Please try again.");
    } finally {
      setIsCaseAssessmentLoading(false);
      setIsStreaming(false);
    }
  };

  // Handler for document comparison
  const handleDocumentComparison = async () => {
    if (!documentA.content.trim() || !documentB.content.trim()) {
      alert("Please enter text in both documents to compare them.");
      return;
    }

    // Check if the selected provider is available (map ZHI names to original API names)
    const apiKeyMapping: Record<string, string> = {
      'zhi1': 'openai',
      'zhi2': 'anthropic', 
      'zhi3': 'deepseek',

    };
    const actualApiKey = apiKeyMapping[selectedProvider] || selectedProvider;
    if (selectedProvider !== "all" && !apiStatus[actualApiKey as keyof typeof apiStatus]) {
      alert(`The ${selectedProvider} API key is not configured or is invalid. Please select a different provider or ensure the API key is properly set.`);
      return;
    }

    setIsComparisonLoading(true);
    setComparisonResult(null);

    try {
      const provider = selectedProvider === "all" ? "zhi1" : selectedProvider;
      
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentA: documentA.content,
          documentB: documentB.content,
          provider: provider
        }),
      });

      if (!response.ok) {
        throw new Error(`Document comparison failed: ${response.statusText}`);
      }

      const data = await response.json();
      setComparisonResult(data);
      setComparisonModalOpen(true);
      
    } catch (error) {
      console.error("Error comparing documents:", error);
      alert(`Document comparison failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsComparisonLoading(false);
    }
  };

  // Handler for fiction assessment - REAL-TIME STREAMING
  const handleFictionAssessment = async (documentId: "A" | "B") => {
    const document = documentId === "A" ? documentA : documentB;
    if (!document.content.trim()) {
      alert(`Please enter some text in Document ${documentId}.`);
      return;
    }

    // Check if the selected provider is available (map ZHI names to original API names)
    const apiKeyMapping: Record<string, string> = {
      'zhi1': 'openai',
      'zhi2': 'anthropic', 
      'zhi3': 'deepseek',

    };
    const actualApiKey = apiKeyMapping[selectedProvider] || selectedProvider;
    if (selectedProvider !== "all" && !apiStatus[actualApiKey as keyof typeof apiStatus]) {
      alert(`The ${selectedProvider} API key is not configured or is invalid. Please select a different provider or ensure the API key is properly set.`);
      return;
    }

    // Reset any previous streaming state
    setIsStreaming(false);
    setStreamingContent('');
    
    // Start REAL-TIME streaming for fiction assessment
    setIsStreaming(true);
    setIsFictionAssessmentLoading(true);
    setFictionAssessmentResult(null);

    try {
      const provider = selectedProvider === "all" ? "zhi1" : selectedProvider;
      
      const response = await fetch('/api/fiction-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: document.content,
          provider: provider
        }),
      });

      if (!response.ok) {
        throw new Error(`Fiction assessment failed: ${response.statusText}`);
      }

      // REAL-TIME STREAMING: Read response token by token
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setStreamingContent(fullResponse); // Show each token as it arrives
      }

      // Parse the fiction assessment response to extract scores
      const parseFictionScores = (text: string) => {
        const extractScore = (pattern: string): number => {
          const regex = new RegExp(`${pattern}[:\\s]*(\\d+)(?:/100)?`, 'i');
          const match = text.match(regex);
          return match ? parseInt(match[1]) : 0;
        };

        return {
          worldCoherence: extractScore('WORLD COHERENCE'),
          emotionalPlausibility: extractScore('EMOTIONAL PLAUSIBILITY'),
          thematicDepth: extractScore('THEMATIC DEPTH'),
          narrativeStructure: extractScore('NARRATIVE STRUCTURE'),
          proseControl: extractScore('PROSE CONTROL'),
          overallFictionScore: extractScore('OVERALL FICTION SCORE'),
          detailedAssessment: fullResponse
        };
      };

      const fictionAssessmentData = parseFictionScores(fullResponse);
      setFictionAssessmentResult(fictionAssessmentData);
      setCurrentFictionDocument(documentId);
      
      // CREATE FICTION ASSESSMENT ONLY RESULT - NOT INTELLIGENCE ASSESSMENT  
      setAnalysisA({
        id: Date.now(),
        formattedReport: "", // Empty so it doesn't show in intelligence section
        overallScore: undefined, // No intelligence score
        provider: provider,
        analysis: "",
        summary: "",
        fictionAssessment: fictionAssessmentData,
        analysisType: "fiction_assessment", // Flag to identify this as fiction assessment
      });
      
      // NO POPUP - Results are now in main report only
      
    } catch (error) {
      console.error("Error performing fiction assessment:", error);
      alert(`Fiction assessment with ${selectedProvider} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsFictionAssessmentLoading(false);
      setIsStreaming(false);
      setStreamingContent(''); // Clean up streaming content
    }
  };

  // Handler for fiction comparison
  const handleFictionComparison = () => {
    if (!documentA.content.trim() || !documentB.content.trim()) {
      alert("Please enter text in both documents to compare them.");
      return;
    }

    setFictionComparisonModalOpen(true);
  };

  // Handler for maximize intelligence
  const handleMaximizeIntelligence = async () => {
    if (!documentA.content.trim()) {
      alert("Please provide document content first.");
      return;
    }

    setIsMaximizeIntelligenceLoading(true);
    try {
      const instructionsToUse = customInstructions.trim() || defaultInstructions;
      
      const response = await fetch('/api/intelligent-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: documentA.content,
          customInstructions: instructionsToUse,
          provider: selectedProvider === "all" ? "zhi1" : selectedProvider
        }),
      });

      if (!response.ok) {
        throw new Error(`Rewrite failed: ${response.statusText}`);
      }

      const data = await response.json();
      setRewriteResult(data.result?.rewrittenText || data.rewrittenText || "No rewrite result returned");
      
      // Store the complete result data and show results modal
      setRewriteResultData(data.result);
      setRewriteResultsModalOpen(true);
      
    } catch (error) {
      console.error('Maximize intelligence error:', error);
      alert(error instanceof Error ? error.message : "Failed to maximize intelligence. Please try again.");
    } finally {
      setIsMaximizeIntelligenceLoading(false);
      setMaximizeIntelligenceModalOpen(false);
    }
  };
  // Handler for downloading rewrite results

  const handleDownloadRewrite = () => {
    if (!rewriteResultData) return;
    
    const content = `INTELLIGENT REWRITE RESULTS
${"=".repeat(50)}

ORIGINAL TEXT:
${rewriteResultData.originalText}

REWRITTEN TEXT:
${rewriteResultData.rewrittenText}

SCORE IMPROVEMENT:
Original Score: ${rewriteResultData.originalScore}/100
Rewritten Score: ${rewriteResultData.rewrittenScore}/100
Improvement: ${rewriteResultData.rewrittenScore - rewriteResultData.originalScore} points

REWRITE REPORT:
${rewriteResultData.rewriteReport || "No detailed report available"}

Provider: ${rewriteResultData.provider}
Instructions: ${rewriteResultData.instructions}

Generated on: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelligent-rewrite-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUseRewrittenText = () => {
    if (rewriteResultData?.rewrittenText) {
      setDocumentA(prev => ({ ...prev, content: rewriteResultData.rewrittenText }));
      setRewriteResultsModalOpen(false);
    }
  };

  const handleKeepOriginalText = () => {
    setRewriteResultsModalOpen(false);
  };

  // Handler for sending rewritten text to intelligence analysis
  const handleSendToIntelligenceAnalysis = () => {
    if (rewriteResultData?.rewrittenText) {
      setDocumentA(prev => ({ ...prev, content: rewriteResultData.rewrittenText }));
      setRewriteResultsModalOpen(false);
      // Optional: Auto-trigger intelligence analysis
      // setTimeout(() => handleCognitiveQuick(), 100);
    }
  };

  // Handler for analyzing documents - FIXED MAIN ANALYSIS
  // Helper function to get content for analysis based on chunk selection
  const getContentForAnalysis = (document: DocumentInputType): string => {
    // If no chunks or no chunks selected, use full content
    if (!document.chunks || !document.selectedChunkIds || document.selectedChunkIds.length === 0) {
      return document.content;
    }
    
    // Combine selected chunks
    const selectedChunks = document.chunks.filter(chunk => 
      document.selectedChunkIds!.includes(chunk.id)
    );
    
    return selectedChunks.map(chunk => chunk.content).join('\n\n');
  };

  const handleAnalyze = async () => {
    const contentA = getContentForAnalysis(documentA);
    const contentB = getContentForAnalysis(documentB);
    
    if (!contentA.trim()) {
      const message = documentA.chunks && documentA.chunks.length > 1 
        ? "Please select at least one chunk to analyze from Document A."
        : "Please enter some text in Document A.";
      alert(message);
      return;
    }

    if (mode === "compare" && !contentB.trim()) {
      const message = documentB.chunks && documentB.chunks.length > 1 
        ? "Please select at least one chunk to analyze from Document B."
        : "Please enter some text in Document B for comparison.";
      alert(message);
      return;
    }
    
    // Check if the selected provider is available (map ZHI names to original API names)
    const apiKeyMapping: Record<string, string> = {
      'zhi1': 'openai',
      'zhi2': 'anthropic', 
      'zhi3': 'deepseek',

    };
    const actualApiKey = apiKeyMapping[selectedProvider] || selectedProvider;
    if (selectedProvider !== "all" && !apiStatus[actualApiKey as keyof typeof apiStatus]) {
      alert(`The ${selectedProvider} API key is not configured or is invalid. Please select a different provider or ensure the API key is properly set.`);
      return;
    }

    // FIXED: Use proper analysis for single document mode
    if (mode === "single") {
      setShowResults(true);
      setIsAnalysisLoading(true);
      
      try {
        const provider = selectedProvider === "all" ? "zhi1" : selectedProvider;
        if (analysisType === "quick") {
          // Quick analysis - regular API call
          const response = await fetch('/api/cognitive-quick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: contentA, provider: provider }),
          });

          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
          }

          const data = await response.json();
          setAnalysisA(data.analysis || data.result);
        } else {
          // Reset any previous streaming state
          setIsStreaming(false);
          setStreamingContent('');
          
          // Comprehensive analysis - streaming
          setIsStreaming(true);
          
          const response = await fetch('/api/stream-comprehensive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: contentA, provider: provider }),
          });

          if (!response.ok) {
            throw new Error(`Streaming failed: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;
              setStreamingContent(fullContent);
            }
            
            // Extract actual score from streamed content
            const scoreMatch = fullContent.match(/FINAL SCORE:\s*(\d+)\/100/i) || 
                              fullContent.match(/Final Score:\s*(\d+)\/100/i) ||
                              fullContent.match(/Score:\s*(\d+)\/100/i);
            const actualScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            // Convert streaming content to analysis format
            setAnalysisA({
              id: Date.now(),
              formattedReport: fullContent,
              overallScore: actualScore, // Use actual AI-generated score
              provider: provider
            });
          }
          
          setIsStreaming(false);
          setStreamingContent(''); // Clean up streaming content
        }
        
      } catch (error) {
        console.error("Error analyzing document:", error);
        alert(`Analysis with ${selectedProvider} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsAnalysisLoading(false);
      }
      return;
    }
    
    // Regular analysis logic for comparison mode
    setShowResults(true);
    setIsAnalysisLoading(true);
    
    try {
      // Two-document mode: use existing comparison logic for now
      if (analysisType === "quick") {
        const provider = selectedProvider === "all" ? "zhi1" : selectedProvider;
        
        const response = await fetch('/api/quick-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentA: contentA,
            documentB: contentB,
            provider: provider
          }),
        });

        if (!response.ok) {
          throw new Error(`Quick comparison failed: ${response.statusText}`);
        }

        const data = await response.json();
        setAnalysisA(data.analysisA);
        setAnalysisB(data.analysisB);
        setComparison(data.comparison);
      } else {
        // Use the comprehensive comparison (existing logic)
        console.log(`Comparing with ${selectedProvider}...`);
        // Create temporary documents with the selected content for comparison
        const tempDocA = { ...documentA, content: contentA };
        const tempDocB = { ...documentB, content: contentB };
        const results = await compareDocuments(tempDocA, tempDocB, selectedProvider);
        setAnalysisA(results.analysisA);
        setAnalysisB(results.analysisB);
        setComparison(results.comparison);
      }
    } catch (error) {
      console.error("Error comparing documents:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Comparison with ${selectedProvider} failed: ${errorMessage}\n\nPlease verify that the ${selectedProvider} API key is correctly configured.`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };
  

  
  // Handler for resetting the entire analysis
  const handleReset = () => {
    // Clear document inputs
    setDocumentA({ content: "" });
    setDocumentB({ content: "" });
    
    // Clear analysis results
    setAnalysisA(null);
    setAnalysisB(null);
    setComparison(null);
    
    // Clear streaming content
    setIsStreaming(false);
    setStreamingContent('');
    
    // Reset UI states
    setShowResults(false);
    setIsAnalysisLoading(false);
    setIsAICheckLoading(false);
    setAIDetectionResult(undefined);
    
    // Reset to single mode
    setMode("single");
    
    // Scroll to top
    window.scrollTo(0, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Intelligence Analysis Tool</h1>
        <p className="text-gray-600">Analyze, compare, and enhance writing samples with AI-powered intelligence evaluation</p>
      </header>

      {/* Analysis Mode Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Settings</h2>
        <div className="flex flex-wrap gap-8 items-center">
          <ModeToggle mode={mode} setMode={setMode} />
          
          {/* Analysis Mode Toggle */}
          <div className="border p-4 rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Analysis Mode</h3>
            <div className="flex gap-3">
              <Button
                onClick={() => setAnalysisType("quick")}
                variant={analysisType === "quick" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Quick Analysis
              </Button>
              <Button
                onClick={() => setAnalysisType("comprehensive")}
                variant={analysisType === "comprehensive" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Comprehensive
                <Badge variant="secondary" className="ml-1 text-xs">
                  ~3 min
                </Badge>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {analysisType === "quick" 
                ? "Fast assessment focusing on core intelligence indicators"
                : "In-depth 4-phase evaluation protocol (takes up to 3 minutes)"
              }
            </p>
          </div>
          
          <div className="border p-4 rounded-lg bg-white shadow-sm mt-2 md:mt-0">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Choose Your AI Provider</h3>
            <ProviderSelector 
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              label="AI Provider"
              apiStatus={apiStatus}
              className="mb-3"
            />
            
            {/* API Status Indicators */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Provider Status:</h4>
              <div className="flex flex-wrap gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.openai ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.openai ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  ZHI 1: {apiStatus.openai ? 'Active' : 'Inactive'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.anthropic ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.anthropic ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  ZHI 2: {apiStatus.anthropic ? 'Active' : 'Inactive'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.deepseek ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.deepseek ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  ZHI 3: {apiStatus.deepseek ? 'Active' : 'Inactive'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.perplexity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.perplexity ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  ZHI 4: {apiStatus.perplexity ? 'Active' : 'Inactive'}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">All API providers are active and ready to use. Each offers different analysis capabilities.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Input Section */}
      <div className="mb-8">
        {/* Document A */}
        <DocumentInput
          id="A"
          document={documentA}
          setDocument={setDocumentA}
          onCheckAI={() => handleCheckAI("A")}
        />

        {/* Document B (shown only in compare mode) */}
        {mode === "compare" && (
          <DocumentInput
            id="B"
            document={documentB}
            setDocument={setDocumentB}
            onCheckAI={() => handleCheckAI("B")}
          />
        )}

        {/* Analysis Options */}
        {mode === "single" ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">Choose Analysis Type</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">Run any or all analyses on your document - no need to re-upload text</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Intelligence Analysis */}
              <div className="text-center">
                <Button
                  onClick={handleAnalyze}
                  className="w-full px-4 py-6 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 flex flex-col items-center min-h-[100px]"
                  disabled={isAnalysisLoading || !documentA.content.trim()}
                >
                  <Brain className="h-6 w-6 mb-2" />
                  <span className="text-sm">
                    {isAnalysisLoading ? "Analyzing..." : "Intelligence Analysis"}
                  </span>
                </Button>
                <p className="text-xs text-gray-500 mt-2">Assess cognitive abilities and intelligence</p>
              </div>

              {/* Case Assessment */}
              <div className="text-center">
                <Button
                  onClick={handleCaseAssessment}
                  className="w-full px-4 py-6 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 flex flex-col items-center min-h-[100px]"
                  disabled={isCaseAssessmentLoading || !documentA.content.trim()}
                >
                  <FileEdit className="h-6 w-6 mb-2" />
                  <span className="text-sm text-center leading-tight">
                    {isCaseAssessmentLoading ? "Assessing..." : "Case Assessment"}
                  </span>
                </Button>
                <p className="text-xs text-gray-500 mt-2">How well does it make its case?</p>
              </div>

              {/* Fiction Assessment */}
              <div className="text-center">
                <Button
                  onClick={() => handleFictionAssessment("A")}
                  className="w-full px-4 py-6 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 flex flex-col items-center min-h-[100px]"
                  disabled={!documentA.content.trim() || isFictionAssessmentLoading}
                >
                  {isFictionAssessmentLoading ? (
                    <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                  ) : (
                    <FileEdit className="h-6 w-6 mb-2" />
                  )}
                  <span className="text-sm">
                    {isFictionAssessmentLoading ? "Assessing..." : "Fiction Analysis"}
                  </span>
                </Button>
                <p className="text-xs text-gray-500 mt-2">Evaluate creative writing quality</p>
              </div>

              {/* Maximize Intelligence */}
              <div className="text-center">
                <Button
                  onClick={() => setMaximizeIntelligenceModalOpen(true)}
                  className="w-full px-4 py-6 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 flex flex-col items-center min-h-[100px]"
                  disabled={!documentA.content.trim()}
                  data-testid="button-maximize-intelligence"
                >
                  <Sparkles className="h-6 w-6 mb-2" />
                  <span className="text-sm">Maximize Intelligence</span>
                </Button>
                <p className="text-xs text-gray-500 mt-2">Rewrite to boost intelligence score</p>
              </div>
            </div>
            
            {/* Clear All Button */}
            <div className="mt-6 text-center">
              <Button
                onClick={handleReset}
                variant="outline"
                className="px-6 py-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 flex items-center mx-auto"
                disabled={isAnalysisLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span>New Analysis / Clear All</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Comparison Mode Buttons */
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              onClick={handleAnalyze}
              className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 flex items-center"
              disabled={isAnalysisLoading}
            >
              <Brain className="h-5 w-5 mr-2" />
              <span>
                {isAnalysisLoading ? "Analyzing..." : "Analyze Both Documents"}
              </span>
            </Button>
            
            <Button
              onClick={handleDocumentComparison}
              className="px-6 py-3 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 flex items-center"
              disabled={!documentA.content.trim() || !documentB.content.trim() || isComparisonLoading}
            >
              <FileEdit className="h-5 w-5 mr-2" />
              <span>
                {isComparisonLoading ? "Comparing..." : "Which One Makes Its Case Better?"}
              </span>
            </Button>
            
            <Button
              onClick={handleFictionComparison}
              className="px-6 py-3 bg-amber-600 text-white rounded-md font-semibold hover:bg-amber-700 flex items-center"
              disabled={!documentA.content.trim() || !documentB.content.trim()}
            >
              <FileEdit className="h-5 w-5 mr-2" />
              <span>Compare Fiction</span>
            </Button>            
            <Button
              onClick={handleReset}
              className="px-6 py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 flex items-center"
              disabled={isAnalysisLoading}
            >
              <Trash2 className="h-5 w-5 mr-2" />
              <span>New Analysis / Clear All</span>
            </Button>
          </div>
        )}
      </div>

      {/* AI Detection Modal */}
      <AIDetectionModal
        isOpen={aiDetectionModalOpen}
        onClose={() => setAIDetectionModalOpen(false)}
        result={aiDetectionResult}
        isLoading={isAICheckLoading}
      />

      {/* Results Section */}
      {showResults && (
        <div id="resultsSection">
          {/* Loading Indicator */}
          {isAnalysisLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Analyzing document content...</p>
            </div>
          ) : (
            <div>
              {/* Document A Results */}
              {analysisA && <DocumentResults id="A" analysis={analysisA} originalDocument={documentA} analysisMode={analysisType} />}

              {/* Document B Results (only in compare mode) */}
              {mode === "compare" && analysisB && (
                <DocumentResults id="B" analysis={analysisB} originalDocument={documentB} analysisMode={analysisType} />
              )}

              {/* Comparative Results (only in compare mode) */}
              {mode === "compare" && comparison && analysisA && analysisB && (
                <ComparativeResults
                  analysisA={analysisA}
                  analysisB={analysisB}
                  comparison={comparison}
                  documentAText={documentA?.content}
                  documentBText={documentB?.content}
                />
              )}
              

              
              {/* Semantic Density Analysis - always shown when there's text */}
              {mode === "single" && documentA.content.trim() && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8 mt-8">
                  <SemanticDensityAnalyzer text={documentA.content} />
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* Case Assessment Modal - REMOVED: Results now show in main report only */}

      {/* Document Comparison Modal */}
      <DocumentComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        result={comparisonResult}
        isLoading={isComparisonLoading}
      />

      {/* AI Detection Modal */}
      <AIDetectionModal
        isOpen={aiDetectionModalOpen}
        onClose={() => setAIDetectionModalOpen(false)}
        result={aiDetectionResult}
        isLoading={isAICheckLoading}
      />

      {/* Fiction Assessment Modal - REMOVED: Results now show in main report only */}

      {/* Fiction Comparison Modal */}
      <FictionComparisonModal
        isOpen={fictionComparisonModalOpen}
        onClose={() => setFictionComparisonModalOpen(false)}
        documentA={{
          content: documentA.content,
          title: documentA.filename || "Document A"
        }}
        documentB={{
          content: documentB.content,
          title: documentB.filename || "Document B"
        }}
      />



      {/* Inline Streaming Results Area */}
      {(isStreaming || streamingContent) && (
        <div className="mx-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">
                🎯 Intelligence Analysis
                {isStreaming && <span className="ml-2 text-sm font-normal text-blue-600">Streaming...</span>}
              </h3>
            </div>
            <div className="bg-white rounded-md p-4 border border-blue-100 min-h-[200px]">
              <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {streamingContent}
                {isStreaming && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1">|</span>}
              </div>
            </div>
            {streamingContent && !isStreaming && (
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={() => setStreamingContent('')}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  New Analysis
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maximize Intelligence Modal */}
      <Dialog open={maximizeIntelligenceModalOpen} onOpenChange={setMaximizeIntelligenceModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Maximize Intelligence
            </DialogTitle>
            <DialogDescription>
              Customize rewrite instructions to maximize intelligence scores, or use our default optimization criteria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Custom Instructions (optional)
              </label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Enter custom rewrite instructions here. If left empty, default optimization criteria will be used."
                className="min-h-[120px]"
                data-testid="textarea-custom-instructions"
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Default Instructions (used if custom field is empty):</h4>
              <div className="text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {defaultInstructions}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMaximizeIntelligenceModalOpen(false)}
              data-testid="button-cancel-maximize"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMaximizeIntelligence}
              disabled={isMaximizeIntelligenceLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-maximize"
            >
              {isMaximizeIntelligenceLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Maximize Intelligence
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intelligent Rewrite Results Modal */}
      <Dialog open={rewriteResultsModalOpen} onOpenChange={setRewriteResultsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600" />
              Intelligent Rewrite Results
            </DialogTitle>
            <DialogDescription>
              Your text has been optimized for maximum intelligence scoring. Review the results below.
            </DialogDescription>
          </DialogHeader>
          
          {rewriteResultData && (
            <div className="space-y-6">
              {/* Score Improvement */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">Score Improvement</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{rewriteResultData.originalScore}/100</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Original</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-600 dark:text-emerald-400">
                      {rewriteResultData.rewrittenScore > rewriteResultData.originalScore ? "+" : ""}
                      {rewriteResultData.rewrittenScore - rewriteResultData.originalScore}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Change</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{rewriteResultData.rewrittenScore}/100</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Rewritten</div>
                  </div>
                </div>
              </div>

              {/* Rewritten Text */}
              <div>
                <h3 className="font-semibold mb-2">Rewritten Text</h3>
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 max-h-60 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{rewriteResultData.rewrittenText}</p>
                </div>
              </div>

              {/* Original Text for comparison */}
              <div>
                <h3 className="font-semibold mb-2">Original Text</h3>
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 max-h-40 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{rewriteResultData.originalText}</p>
                </div>
              </div>

              {/* Rewrite Report if available */}
              {rewriteResultData.rewriteReport && (
                <div>
                  <h3 className="font-semibold mb-2">Rewrite Analysis Report</h3>
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 max-h-40 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{rewriteResultData.rewriteReport}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={handleDownloadRewrite}
              className="flex items-center gap-2"
              data-testid="button-download-rewrite"
            >
              <Download className="w-4 h-4" />
              Download Results
            </Button>
            <Button 
              variant="outline" 
              onClick={handleKeepOriginalText}
              data-testid="button-keep-original"
            >
              Keep Original
            </Button>
            <Button 
              onClick={handleSendToIntelligenceAnalysis}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-send-to-intelligence"
            >
              <Brain className="w-4 h-4 mr-2" />
              Send to Intelligence Analysis
            </Button>
            <Button 
              onClick={handleUseRewrittenText}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-use-rewritten"
            >
              Use Rewritten Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog - Always visible below everything */}
      <ChatDialog 
        currentDocument={documentA.content}
        analysisResults={mode === "single" ? analysisA : comparison}
        onSendToInput={(content: string) => {
          setDocumentA({ ...documentA, content: content });
        }}
      />
    </div>
  );
};

export default HomePage;