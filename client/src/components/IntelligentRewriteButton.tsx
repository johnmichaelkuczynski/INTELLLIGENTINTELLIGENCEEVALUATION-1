import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { DocumentAnalysis } from '@/lib/types';

interface IntelligentRewriteButtonProps {
  originalText: string;
  originalAnalysis?: DocumentAnalysis;
  onRewriteComplete?: (newText: string, newAnalysis: DocumentAnalysis) => void;
  provider?: string;
  className?: string;
}

const IntelligentRewriteButton: React.FC<IntelligentRewriteButtonProps> = ({
  originalText,
  originalAnalysis,
  onRewriteComplete,
  provider = 'zhi1',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [rewriteResult, setRewriteResult] = useState<{
    rewrittenText: string;
    newAnalysis: DocumentAnalysis;
    improvement: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRewrite = async () => {
    if (!originalText.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/intelligent-rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: originalText,
          customInstructions: customInstructions.trim() || undefined,
          provider: provider
        }),
      });

      if (!response.ok) {
        throw new Error('Rewrite failed');
      }

      const data = await response.json();
      if (data.success && data.result) {
        const newAnalysis = {
          id: Date.now(),
          formattedReport: data.result.newAnalysis.analysis,
          overallScore: data.result.newAnalysis.intelligence_score,
          provider: data.result.provider,
          analysis: data.result.newAnalysis.analysis,
          summary: data.result.newAnalysis.analysis
        };

        setRewriteResult({
          rewrittenText: data.result.rewrittenText,
          newAnalysis: newAnalysis,
          improvement: `Intelligence score improved to ${data.result.newAnalysis.intelligence_score}/100`
        });

        if (onRewriteComplete) {
          onRewriteComplete(data.result.rewrittenText, newAnalysis);
        }
      }
    } catch (error) {
      console.error('Intelligent rewrite error:', error);
      alert('Rewrite failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (rewriteResult?.rewrittenText) {
      await navigator.clipboard.writeText(rewriteResult.rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setRewriteResult(null);
    setCustomInstructions('');
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Intelligent Rewrite
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Intelligent Rewrite
            </DialogTitle>
            <DialogDescription>
              Maximize intelligence scores using your exact protocol. Enter custom instructions (optional) like "quote Carl Hempel" or "add statistical data".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Quote Carl Hempel, add statistical data, reference specific studies..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Original Analysis Score */}
            {originalAnalysis && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Current Intelligence Score</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {originalAnalysis.overallScore}/100
                </div>
              </div>
            )}

            {/* Rewrite Button */}
            {!rewriteResult && (
              <Button
                onClick={handleRewrite}
                disabled={isLoading || !originalText.trim()}
                className="w-full"
              >
                {isLoading ? (
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
            )}

            {/* Results */}
            {rewriteResult && (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Rewrite Complete!</h4>
                  <div className="text-sm text-green-700">
                    {rewriteResult.improvement}
                    {originalAnalysis && (
                      <span className="ml-2">
                        (improved from {originalAnalysis.overallScore}/100)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Rewritten Text</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-white border rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {rewriteResult.rewrittenText}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setRewriteResult(null);
                      setCustomInstructions('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Rewrite Again
                  </Button>
                  <Button
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IntelligentRewriteButton;