import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { toast } = useToast();
  
  // Box A: AI text to rewrite
  const [boxA, setBoxA] = useState("");
  const [boxAScore, setBoxAScore] = useState<number | null>(null);
  
  // Box B: Human style sample
  const [boxB, setBoxB] = useState("");
  const [boxBScore, setBoxBScore] = useState<number | null>(null);
  
  // Box C: Rewritten output
  const [boxC, setBoxC] = useState("");
  const [boxCScore, setBoxCScore] = useState<number | null>(null);
  
  // Custom instructions
  const [customInstructions, setCustomInstructions] = useState("");
  
  // LLM Provider (default: anthropic)
  const [provider, setProvider] = useState("anthropic");
  
  // Selected writing sample
  const [selectedSample, setSelectedSample] = useState("Content-Neutral|Formal and Functional Relationships");
  
  // Style presets
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  
  // Loading states
  const [isRewriting, setIsRewriting] = useState(false);
  const [isReRewriting, setIsReRewriting] = useState(false);
  const [isEvaluatingA, setIsEvaluatingA] = useState(false);
  const [isEvaluatingB, setIsEvaluatingB] = useState(false);
  const [isEvaluatingC, setIsEvaluatingC] = useState(false);
  
  // Writing samples and style presets
  const [writingSamples, setWritingSamples] = useState<any>({});
  const [stylePresets, setStylePresets] = useState<any>({});

  // Load writing samples and style presets
  useEffect(() => {
    Promise.all([
      fetch('/api/writing-samples').then(r => r.json()),
      fetch('/api/style-presets').then(r => r.json())
    ]).then(([samples, presets]) => {
      setWritingSamples(samples.samples);
      setStylePresets(presets.presets);
      
      // Set default sample in Box B
      const defaultSample = samples.samples["Content-Neutral"]?.["Formal and Functional Relationships"];
      if (defaultSample) {
        setBoxB(defaultSample);
        evaluateText(defaultSample, setBoxBScore, setIsEvaluatingB);
      }
    });
  }, []);

  // Auto-evaluate text with GPTZero
  const evaluateText = async (text: string, setScore: (score: number) => void, setLoading: (loading: boolean) => void) => {
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/evaluate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      if (data.success) {
        setScore(data.humanPercentage);
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-evaluate Box A when text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (boxA.trim()) {
        evaluateText(boxA, setBoxAScore, setIsEvaluatingA);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [boxA]);

  // Auto-evaluate Box B when text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (boxB.trim()) {
        evaluateText(boxB, setBoxBScore, setIsEvaluatingB);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [boxB]);

  // Handle sample selection
  const handleSampleSelect = (value: string) => {
    setSelectedSample(value);
    const [category, sampleName] = value.split('|');
    const sample = writingSamples[category]?.[sampleName];
    if (sample) {
      setBoxB(sample);
    }
  };

  // Handle preset toggle
  const togglePreset = (preset: string) => {
    setSelectedPresets(prev => 
      prev.includes(preset) 
        ? prev.filter(p => p !== preset)
        : [...prev, preset]
    );
  };

  // Main rewrite function
  const handleRewrite = async () => {
    if (!boxA.trim() || !boxB.trim()) {
      toast({
        title: "Missing Input",
        description: "Both Box A and Box B must contain text.",
        variant: "destructive",
      });
      return;
    }

    setIsRewriting(true);
    try {
      const response = await fetch('/api/gpt-bypass-humanizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxA,
          boxB,
          provider,
          customInstructions,
          stylePresets: selectedPresets
        })
      });

      const data = await response.json();
      if (data.success) {
        setBoxC(data.result.humanizedText);
        setBoxCScore(data.result.humanizedAIScore);
        toast({
          title: "Rewrite Complete!",
          description: `Original: ${data.result.originalAIScore}% Human → Rewrite: ${data.result.humanizedAIScore}% Human`,
        });
      } else {
        throw new Error(data.message || 'Rewrite failed');
      }
    } catch (error: any) {
      toast({
        title: "Rewrite Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
    }
  };

  // Re-rewrite function (recursive)
  const handleReRewrite = async () => {
    if (!boxC.trim() || !boxB.trim()) {
      toast({
        title: "Missing Content",
        description: "Box C needs content to re-rewrite.",
        variant: "destructive",
      });
      return;
    }

    setIsReRewriting(true);
    try {
      const response = await fetch('/api/re-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: boxC,
          styleText: boxB,
          provider,
          customInstructions,
          stylePresets: selectedPresets
        })
      });

      const data = await response.json();
      if (data.success) {
        const oldScore = boxCScore;
        setBoxC(data.result.humanizedText);
        setBoxCScore(data.result.humanizedAIScore);
        toast({
          title: "Re-rewrite Complete!",
          description: `${oldScore}% → ${data.result.humanizedAIScore}% Human`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Re-rewrite Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReRewriting(false);
    }
  };

  // Get score display with emoji
  const getScoreDisplay = (score: number | null, isLoading: boolean) => {
    if (isLoading) return <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin" /></Badge>;
    if (score === null) return null;
    
    const emoji = score >= 80 ? "👤" : score >= 50 ? "🤖" : "🤖";
    const variant = score >= 80 ? "default" : "destructive";
    
    return <Badge variant={variant}>{emoji} {score}% HUMAN</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">GPT Bypass Humanizer</h1>
          <p className="text-muted-foreground">
            Convert AI-written text to undetectable human writing using style cloning
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="col-span-3 space-y-4">
            {/* LLM Provider */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">LLM Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Default)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Writing Samples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Writing Samples</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedSample} onValueChange={handleSampleSelect}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(writingSamples).map(([category, samples]: [string, any]) =>
                      Object.keys(samples).map(sampleName => (
                        <SelectItem key={`${category}|${sampleName}`} value={`${category}|${sampleName}`}>
                          [{category}] {sampleName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Style Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Style Presets</CardTitle>
                <p className="text-xs text-muted-foreground">1-8 are most effective for humanizing</p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(stylePresets).map(([preset, description]: [string, any], index) => (
                  <div key={preset} className="flex items-start space-x-2">
                    <Checkbox
                      id={preset}
                      checked={selectedPresets.includes(preset)}
                      onCheckedChange={() => togglePreset(preset)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={preset} className="text-xs font-medium">
                        {index < 8 && "⭐"} {preset}
                      </Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9 space-y-6">
            {/* Box A */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Box A: AI Text to Rewrite</CardTitle>
                {getScoreDisplay(boxAScore, isEvaluatingA)}
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste AI-generated text here..."
                  value={boxA}
                  onChange={(e) => setBoxA(e.target.value)}
                  className="min-h-40 resize-none"
                />
              </CardContent>
            </Card>

            {/* Custom Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Instructions (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter any specific instructions for the rewrite..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="min-h-24 resize-none"
                />
              </CardContent>
            </Card>

            {/* Box B */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Box B: Human Style Sample</CardTitle>
                {getScoreDisplay(boxBScore, isEvaluatingB)}
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste human writing sample to clone..."
                  value={boxB}
                  onChange={(e) => setBoxB(e.target.value)}
                  className="min-h-40 resize-none"
                />
              </CardContent>
            </Card>

            {/* Rewrite Button */}
            <div className="flex justify-center">
              <Button 
                onClick={handleRewrite} 
                disabled={isRewriting || !boxA.trim() || !boxB.trim()}
                size="lg"
                className="px-12"
              >
                {isRewriting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  "Rewrite Text"
                )}
              </Button>
            </div>

            {/* Box C */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Box C: Rewritten Output</CardTitle>
                {getScoreDisplay(boxCScore, isEvaluatingC)}
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Rewritten text will appear here..."
                  value={boxC}
                  readOnly
                  className="min-h-40 resize-none"
                />
              </CardContent>
            </Card>

            {/* Re-rewrite Button */}
            {boxC && (
              <div className="flex justify-center">
                <Button 
                  onClick={handleReRewrite} 
                  disabled={isReRewriting || !boxC.trim()}
                  variant="outline"
                  size="lg"
                  className="px-12"
                >
                  {isReRewriting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Re-rewriting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      REHUMANIZE
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}