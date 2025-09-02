import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import TranslationPage from "@/pages/TranslationPage";

import WebSearchPage from "@/pages/WebSearchPage";

import { AnalyticsPage } from "@/pages/AnalyticsPage";
import NotFound from "@/pages/not-found";
import { BrainCircuit, Languages, FileEdit, Globe, Bot, Brain, Mail } from "lucide-react";

function Navigation() {
  return (
    <nav className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="font-bold text-xl">Cognitive Analysis Platform</div>
          <a 
            href="mailto:contact@zhisystems.ai" 
            className="flex items-center gap-2 hover:underline text-sm"
          >
            <Mail className="h-4 w-4" />
            <span>Contact Us</span>
          </a>
        </div>
        <ul className="flex gap-6">
          <li>
            <Link href="/" className="flex items-center gap-2 hover:underline">
              <BrainCircuit className="h-5 w-5" />
              <span>Intelligence Analysis</span>
            </Link>
          </li>
          <li>
            <Link href="/analytics" className="flex items-center gap-2 hover:underline">
              <Brain className="h-5 w-5" />
              <span>Cognitive Analytics</span>
            </Link>
          </li>

        </ul>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/analytics" component={AnalyticsPage} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
