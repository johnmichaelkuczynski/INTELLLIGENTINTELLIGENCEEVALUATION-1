import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Bot, Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type LLMProvider = "zhi1" | "zhi2" | "zhi3" | "all";

interface ProviderSelectorProps {
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  className?: string;
  label?: string;
  smallSize?: boolean;
  apiStatus?: Record<string, boolean>;
  showTooltips?: boolean;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  className = "",
  label = "AI Provider",
  smallSize = false,
  apiStatus = { openai: true, anthropic: true, deepseek: true },
  showTooltips = true
}) => {
  return (
    <div className={`flex ${smallSize ? "flex-row items-center gap-2" : "flex-col gap-1.5"} ${className}`}>
      <div className="flex items-center gap-2">
        {label && <Label className={smallSize ? "min-w-24" : ""}>{label}</Label>}
        {showTooltips && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Choose which AI provider to use for document analysis:</p>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li><span className="font-medium">OpenAI GPT-4o</span> - Excellent for detailed analysis, strong at recognizing complex patterns</li>
                  <li><span className="font-medium">Anthropic Claude</span> - Very good at nuanced text interpretation and detailed reasoning</li>
                  <li><span className="font-medium">DeepSeek</span> - Advanced reasoning model with strong mathematical and analytical capabilities</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Select value={selectedProvider} onValueChange={(value) => onProviderChange(value as LLMProvider)}>
        <SelectTrigger className={`${smallSize ? "h-8" : ""} min-w-[220px]`}>
          <SelectValue placeholder="Select AI provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem 
            value="zhi1" 
            className="flex items-center" 
            disabled={!apiStatus.openai}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span>ZHI 1</span>
              {!apiStatus.openai && <span className="text-xs text-red-500 ml-2">(Unavailable)</span>}
            </div>
          </SelectItem>
          <SelectItem 
            value="zhi2" 
            className="flex items-center"
            disabled={!apiStatus.anthropic}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-600" />
              <span>ZHI 2</span>
              {!apiStatus.anthropic && <span className="text-xs text-red-500 ml-2">(Unavailable)</span>}
            </div>
          </SelectItem>
          <SelectItem 
            value="zhi3" 
            className="flex items-center"
            disabled={!apiStatus.deepseek}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-orange-600" />
              <span>ZHI 3</span>
              {!apiStatus.deepseek && <span className="text-xs text-red-500 ml-2">(Unavailable)</span>}
            </div>
          </SelectItem>
          {/* Compare Providers option temporarily removed */}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProviderSelector;