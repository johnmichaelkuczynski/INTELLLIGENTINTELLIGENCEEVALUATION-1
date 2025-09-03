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
import { FictionComparisonModal } from "@/components/FictionComparisonModal";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Trash2, FileEdit, Loader2, Zap, Clock, Sparkles, Download, Shield, RefreshCw, Upload, FileText, BookOpen } from "lucide-react";
import { analyzeDocument, compareDocuments, checkForAI } from "@/lib/analysis";
import { AnalysisMode, DocumentInput as DocumentInputType, AIDetectionResult, DocumentAnalysis, DocumentComparison } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const HomePage: React.FC = () => {
  const { toast } = useToast();
  
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
  
  const [fictionComparisonModalOpen, setFictionComparisonModalOpen] = useState(false);

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
  const [selectedProvider, setSelectedProvider] = useState<string>("zhi1");

  // State for chat dialog
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  // State for semantic density analyzer
  const [semanticDensityOpen, setSemanticDensityOpen] = useState(false);
  
  // EXISTING HUMANIZER STATE - KEEP FOR NOW
  const [humanizerOpen, setHumanizerOpen] = useState(false);

  // GPT Bypass Humanizer State
  const [gptBypassModalOpen, setGptBypassModalOpen] = useState(false);

  // Add API status tracking state
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    anthropic: false,
    deepseek: false,
    mathpix: false
  });

  // Check API status on component mount
  useEffect(() => {
    const checkAPIs = async () => {
      try {
        const response = await fetch('/api/check-api');
        const data = await response.json();
        setApiStatus(data.api_keys);
      } catch (error) {
        console.error('Failed to check API status:', error);
      }
    };

    checkAPIs();
  }, []);

  // Rest of component implementation with all handlers except fiction-related ones removed

  const handleAnalyze = async (documentId: "A" | "B") => {
    console.log(`Starting analysis for Document ${documentId}...`);
    
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
      'zhi4': 'perplexity'
    };
    const actualApiKey = apiKeyMapping[selectedProvider] || selectedProvider;
    if (selectedProvider !== "all" && !apiStatus[actualApiKey as keyof typeof apiStatus]) {
      alert(`The ${selectedProvider} API key is not configured or is invalid. Please select a different provider or ensure the API key is properly set.`);
      return;
    }

    setIsAnalysisLoading(true);
    setShowResults(true);

    try {
      let analysis;
      if (analysisType === "quick") {
        analysis = await analyzeDocument(document, selectedProvider === "all" ? "zhi1" : selectedProvider, "quick");
      } else {
        analysis = await analyzeDocument(document, selectedProvider === "all" ? "zhi1" : selectedProvider, "comprehensive");
      }
      
      if (documentId === "A") {
        setAnalysisA(analysis);
      } else {
        setAnalysisB(analysis);
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      alert(`Analysis with ${selectedProvider} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!documentA.content.trim() || !documentB.content.trim()) {
      alert("Please enter text in both documents to compare them.");
      return;
    }

    setIsAnalysisLoading(true);
    setShowResults(true);

    try {
      const comparisonResult = await compareDocuments(documentA, documentB, selectedProvider === "all" ? "zhi1" : selectedProvider);
      setComparison(comparisonResult);
    } catch (error) {
      console.error("Error comparing documents:", error);
      alert(`Comparison with ${selectedProvider} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const clearAll = () => {
    setDocumentA({ content: "" });
    setDocumentB({ content: "" });
    setAnalysisA(null);
    setAnalysisB(null);
    setComparison(null);
    setShowResults(false);
  };

  // Handler for AI Detection
  const handleCheckAI = async (documentId: "A" | "B") => {
    const document = documentId === "A" ? documentA : documentB;
    if (!document.content.trim()) {
      alert(`Please enter some text in Document ${documentId}.`);
      return;
    }

    setCurrentAICheckDocument(documentId);
    setIsAICheckLoading(true);

    try {
      const result = await checkForAI(document.content);
      setAIDetectionResult(result);
      setAIDetectionModalOpen(true);
    } catch (error) {
      console.error("Error checking for AI:", error);
      alert(`AI detection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsAICheckLoading(false);
    }
  };

  // Handler for case assessment
  const handleCaseAssessment = async (documentId: "A" | "B") => {
    const document = documentId === "A" ? documentA : documentB;
    if (!document.content.trim()) {
      alert(`Please enter some text in Document ${documentId}.`);
      return;
    }

    setIsCaseAssessmentLoading(true);
    setCaseAssessmentResult(null);

    try {
      const response = await fetch('/api/case-assessment-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: document.content,
          provider: selectedProvider === "all" ? "zhi1" : selectedProvider,
          context: "general"
        }),
      });

      if (!response.ok) {
        throw new Error(`Case assessment failed: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
      }

      // Parse the response to extract scores
      const parseScores = (text: string) => {
        const extractScore = (pattern: string): number => {
          const regex = new RegExp(`${pattern}[:\\s]*(\\d+)(?:/100)?`, 'i');
          const match = text.match(regex);
          return match ? parseInt(match[1]) : 0;
        };

        return {
          proofEffectiveness: extractScore('PROOF EFFECTIVENESS'),
          claimCredibility: extractScore('CLAIM CRED'),
          nonTriviality: extractScore('TRIVIALITY'),
          proofQuality: extractScore('PROOF QUALITY'),
          functionalWriting: extractScore('FUNCTIONAL WRITING'),
          overallCaseScore: extractScore('OVERALL CASE SCORE'),
          detailedAssessment: text
        };
      };

      const caseData = parseScores(fullResponse);
      setCaseAssessmentResult(caseData);
      setCaseAssessmentModalOpen(true);

    } catch (error) {
      console.error("Error performing case assessment:", error);
      alert(`Case assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCaseAssessmentLoading(false);
    }
  };

  // Handler for document comparison
  const handleDocumentComparison = async () => {
    if (!documentA.content.trim() || !documentB.content.trim()) {
      alert("Please enter text in both documents to compare them.");
      return;
    }

    setIsComparisonLoading(true);

    const provider = selectedProvider === "all" ? "zhi1" : selectedProvider;

    try {
      const response = await fetch('/api/document-compare', {
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
\${"=".repeat(50)}

ORIGINAL TEXT:
\${rewriteResultData.originalText}

REWRITTEN TEXT:
\${rewriteResultData.rewrittenText}

SCORE IMPROVEMENT:
Original Score: \${rewriteResultData.originalScore || 'N/A'}/100
Rewritten Score: \${rewriteResultData.rewrittenScore || 'N/A'}/100
Improvement: \${rewriteResultData.scoreImprovement || 'N/A'} points

Generated: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligent-rewrite-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cognitive Analysis Platform</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <Badge variant="secondary" className="mb-1">
              {apiStatus.openai ? '✓' : '✗'} OpenAI
            </Badge>
            <Badge variant="secondary" className="mb-1 ml-1">
              {apiStatus.anthropic ? '✓' : '✗'} Anthropic
            </Badge>
            <Badge variant="secondary" className="mb-1 ml-1">
              {apiStatus.deepseek ? '✓' : '✗'} DeepSeek
            </Badge>
            <Badge variant="secondary" className="mb-1 ml-1">
              {apiStatus.mathpix ? '✓' : '✗'} Mathpix
            </Badge>
          </div>
          <ModeToggle />
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Mode:</label>
            <Select value={mode} onValueChange={(value) => setMode(value as AnalysisMode)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Document</SelectItem>
                <SelectItem value="comparative">Compare Documents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Analysis Type Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Type:</label>
            <Select value={analysisType} onValueChange={(value) => setAnalysisType(value as "quick" | "comprehensive")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick</SelectItem>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Provider Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Provider:</label>
            <ProviderSelector 
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
            />
          </div>

          {/* Clear All Button */}
          <Button onClick={clearAll} variant="outline" className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-6">
              <DocumentInput
                title="Document A"
                document={documentA}
                onChange={setDocumentA}
                placeholder="Enter or paste your document here..."
              />
              
              {mode === "comparative" && (
                <DocumentInput
                  title="Document B"
                  document={documentB}
                  onChange={setDocumentB}
                  placeholder="Enter or paste your second document here..."
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {mode === "single" ? (
                  <>
                    <Button 
                      onClick={() => handleAnalyze("A")} 
                      disabled={isAnalysisLoading || !documentA.content.trim()}
                      className="flex items-center gap-2"
                    >
                      {isAnalysisLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      {analysisType === "quick" ? "Quick Analysis" : "Comprehensive Analysis"}
                    </Button>

                    <Button
                      onClick={() => handleCheckAI("A")}
                      disabled={isAICheckLoading || !documentA.content.trim()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isAICheckLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                      Check AI
                    </Button>

                    <Button
                      onClick={() => handleCaseAssessment("A")}
                      disabled={isCaseAssessmentLoading || !documentA.content.trim()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isCaseAssessmentLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileEdit className="w-4 h-4" />
                      )}
                      Case Assessment
                    </Button>

                    <Button
                      onClick={() => setMaximizeIntelligenceModalOpen(true)}
                      disabled={!documentA.content.trim()}
                      variant="outline"
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-purple-200"
                    >
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-purple-700">Maximize Intelligence</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleCompare} 
                      disabled={isAnalysisLoading || !documentA.content.trim() || !documentB.content.trim()}
                      className="flex items-center gap-2"
                    >
                      {isAnalysisLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      Compare Documents
                    </Button>

                    <Button
                      onClick={handleDocumentComparison}
                      disabled={isComparisonLoading || !documentA.content.trim() || !documentB.content.trim()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isComparisonLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileEdit className="w-4 h-4" />
                      )}
                      Document Comparison
                    </Button>
                  </>
                )}

                {/* Additional Feature Buttons */}
                <Button
                  onClick={() => setChatDialogOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Chat
                </Button>

                <Button
                  onClick={() => setSemanticDensityOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Semantic Density
                </Button>

                <Button
                  onClick={() => setGptBypassModalOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  GPT Bypass Humanizer
                </Button>
              </div>
            </div>

            {/* Results Section */}
            {showResults && (
              <div className="space-y-6">
                {mode === "single" ? (
                  <DocumentResults 
                    analysis={analysisA} 
                    isLoading={isAnalysisLoading}
                    title="Analysis Results"
                  />
                ) : (
                  <ComparativeResults 
                    analysisA={analysisA}
                    analysisB={analysisB} 
                    comparison={comparison}
                    isLoading={isAnalysisLoading}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AIDetectionModal
        isOpen={aiDetectionModalOpen}
        onClose={() => setAIDetectionModalOpen(false)}
        result={aiDetectionResult}
        documentId={currentAICheckDocument}
      />

      <CaseAssessmentModal
        isOpen={caseAssessmentModalOpen}
        onClose={() => setCaseAssessmentModalOpen(false)}
        result={caseAssessmentResult}
        isLoading={isCaseAssessmentLoading}
      />

      <DocumentComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        result={comparisonResult}
        isLoading={isComparisonLoading}
      />

      <FictionComparisonModal
        isOpen={fictionComparisonModalOpen}
        onClose={() => setFictionComparisonModalOpen(false)}
        documentA={documentA}
        documentB={documentB}
        selectedProvider={selectedProvider}
      />

      {/* Maximize Intelligence Modal */}
      <Dialog open={maximizeIntelligenceModalOpen} onOpenChange={setMaximizeIntelligenceModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Maximize Intelligence
            </DialogTitle>
            <DialogDescription>
              Rewrite your text to achieve the highest possible intelligence score using advanced cognitive optimization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Custom Instructions (Optional)</label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add custom instructions to guide the rewrite (optional). Leave blank to use default intelligence optimization."
                className="min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: Optimize for insight, logical structure, fresh perspectives, and authentic intelligence
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMaximizeIntelligenceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMaximizeIntelligence}
              disabled={isMaximizeIntelligenceLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isMaximizeIntelligenceLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Maximize Intelligence
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rewrite Results Modal */}
      <Dialog open={rewriteResultsModalOpen} onOpenChange={setRewriteResultsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Intelligence Maximization Results
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Score Improvement Section */}
            {rewriteResultData && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {rewriteResultData.originalScore || 'N/A'}/100
                  </div>
                  <div className="text-sm text-gray-600">Original Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {rewriteResultData.rewrittenScore || 'N/A'}/100
                  </div>
                  <div className="text-sm text-gray-600">Rewritten Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    +{rewriteResultData.scoreImprovement || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Improvement</div>
                </div>
              </div>
            )}

            {/* Rewritten Text */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Optimized Text
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                  {rewriteResult}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={handleDownloadRewrite}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Results
            </Button>
            <Button
              onClick={() => setRewriteResultsModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Dialogs */}
      <ChatDialog 
        isOpen={chatDialogOpen}
        onClose={() => setChatDialogOpen(false)}
        selectedProvider={selectedProvider}
      />

      <SemanticDensityAnalyzer 
        isOpen={semanticDensityOpen}
        onClose={() => setSemanticDensityOpen(false)}
        text={documentA.content || ""}
      />
    </div>
  );
};

export default HomePage;