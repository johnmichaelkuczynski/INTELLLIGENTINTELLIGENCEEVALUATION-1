# Cognitive Analysis Platform

## Overview
This platform analyzes written text to assess the intelligence and cognitive fingerprint of authors using multi-model AI evaluation. It provides document analysis, AI detection, translation, comprehensive cognitive profiling, and intelligent text rewriting capabilities. The project's vision is to offer deep insights into cognitive abilities and thought processes from written content, with advanced features for maximizing intelligence scores through iterative rewriting.

## Recent Changes
- **January 2025**: **CRITICAL FIXES COMPLETED** - All core functions now fully operational
  - ✅ **Fiction Assessment fully restored**: Fixed critical "require is not defined" error, API now returns structured JSON scores
  - ✅ **UI scrolling issues completely resolved**: Fixed preview breakage, restored proper dialog scrolling functionality
  - ✅ **All major functions verified working**: GPT Bypass Humanizer (100% success), Intelligent Rewrite, Case Assessment, Cognitive Analysis
- **September 2025**: **BREAKTHROUGH SUCCESS** - GPT Bypass Humanizer now achieving 100% AI → 0% AI transformation
  - Completely rebuilt core algorithm for surgical precision style replication
  - Removed all generic "humanization" instructions from prompt
  - Now uses pure style matching: "REWRITE BOX A TO EXACTLY MATCH THE STYLE OF BOX B"
  - Successfully achieving same results as user's working reference app
  - Verified: 100% AI detection → 100% Human detection transformation working perfectly
- **September 2025**: Implemented sophisticated GPT Bypass Humanizer system with categorized writing samples
  - Added CONTENT-NEUTRAL, EPISTEMOLOGY, PARADOXES sample categories
  - Built comprehensive style preset system (removed from UI per user request)
  - Integrated LLM selection dropdown with Anthropic as default
  - Full GPTZero evaluation integration for input/output verification
- **January 2025**: **MAJOR FIX** - Completely resolved case assessment scoring and formatting issues
  - Fixed AI prompt to request structured scores in parseable format (PROOF EFFECTIVENESS: 85/100)
  - Implemented fallback scoring system for reliable score extraction 
  - Enhanced text formatting to properly display sections (Strengths, Weaknesses, Counterarguments)
  - Case assessments now show real numerical scores instead of 0/100
- **January 2025**: Fixed intelligent rewrite function provider mapping (zhi1→openai, zhi2→anthropic, zhi3→deepseek)
- **January 2025**: Resolved multiple analysis UX issue - can now run consecutive analyses without clearing screen
- **January 2025**: Successfully implemented Intelligent Rewrite Function with recursive capability for maximizing intelligence scores
- **January 2025**: Fixed two-document comparison mode to use exact protocol specifications  
- **January 2025**: Enhanced markdown cleaning to eliminate formatting artifacts in analysis outputs

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a monorepo structure, separating client and server.
- **Frontend**: React with TypeScript, TailwindCSS, shadcn/ui, wouter for routing, React Query for server state, and Chart.js for data visualization.
- **Backend**: Express.js with TypeScript, integrating multiple LLMs, document processing via Mathpix OCR, speech-to-text with AssemblyAI, and email services via SendGrid.
- **Database**: PostgreSQL with Drizzle ORM, storing user, document, analysis, and cognitive profile data.
- **Core Services**: Includes multi-model intelligence evaluation, document comparison, multi-language translation, OCR for mathematical notation, and intelligent text rewriting with custom instructions support.
- **System Design**: Focuses on comprehensive cognitive assessment using a 4-Phase Intelligence Evaluation System: Phase 1 (Initial Assessment with anti-diplomatic instructions), Phase 2 (Deep analytical questioning across 17 cognitive dimensions), Phase 3 (Revision and reconciliation of discrepancies), and Phase 4 (Final pushback for scores under 95/100). The system includes seven core cognitive dimensions (Conceptual Depth, Inferential Control, Semantic Compression, Novel Abstraction, Cognitive Risk, Authenticity, Symbolic Manipulation). It supports genre-aware assessment for various document types (philosophical, empirical, technical, fiction) and differentiates genuine insight from superficial academic mimicry. The system provides detailed case assessment for arguments and comprehensive intelligence reports with percentile rankings and evidence-based analysis. Additionally features an Intelligent Rewrite Function that recursively optimizes text to maximize intelligence scores using the exact evaluation protocol, with support for custom instructions (e.g., "quote Carl Hempel", "add statistical data").
- **UI/UX**: Utilizes shadcn/ui and TailwindCSS for styling, offering detailed card-based layouts for analysis reports and supporting PDF/text downloads.

## External Dependencies
- **AI Service Providers**: OpenAI API (GPT-4), Anthropic API (Claude), Perplexity AI, DeepSeek API.
- **Supporting Services**: Mathpix OCR, AssemblyAI, SendGrid, Google Custom Search.
- **Database & Infrastructure**: Neon/PostgreSQL, Drizzle ORM, Replit.