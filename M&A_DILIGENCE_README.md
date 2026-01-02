# M&A Due Diligence Analyzer - Rebuilt

## Overview

This is a completely rebuilt M&A Due Diligence Analyzer platform that analyzes contracts for red flags and risks in mergers and acquisitions. The original corrupted Python code has been successfully migrated to a modern Next.js application.

## What's Been Fixed

### Original Issues
- ✅ Corrupted LLM analyzer code (`dd_llm_analyzer4.py` and `dd_llm_analyzer3.py`)
- ✅ Corrupted Word and PDF documentation files
- ✅ Dependencies on OpenAI (GPT-4) and Anthropic (Claude) APIs
- ✅ Python backend that needed modernization

### What's New
- ✅ Modern Next.js 15 frontend with shadcn/ui components
- ✅ Replaced OpenAI/Anthropic with open-source AI models via z-ai-web-dev-sdk
- ✅ TypeScript for type safety
- ✅ Prisma ORM with SQLite for data persistence
- ✅ Responsive design with mobile-first approach
- ✅ Real-time analysis progress tracking
- ✅ Comprehensive filtering and search capabilities

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                     │
│  - File upload interface                                   │
│  - Progress tracking                                       │
│  - Results visualization                                  │
│  - Filtering and search                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                API Routes (/api/diligence)                 │
│  - POST /analyze - Upload and analyze PDF                │
│  - GET / - API information                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Analysis Pipeline                         │
│  1. PDF Parser - Extract text from documents            │
│  2. Rule Engine - Fast pattern-based detection          │
│  3. LLM Analyzer - AI-powered semantic analysis         │
│  4. Aggregator - Merge, deduplicate, and score         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database (Prisma + SQLite)               │
│  - DiligenceAnalysis - Analysis records                 │
│  - RedFlag - Individual red flag findings               │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Frontend
- **Modern UI**: Clean, professional interface with shadcn/ui components
- **Drag & Drop**: Easy file upload with drag-and-drop support
- **Real-time Progress**: Live updates during analysis
- **Risk Visualization**: Clear display of risk scores and severity levels
- **Advanced Filtering**: Search and filter by severity, category, and text
- **Export**: Download full analysis reports as JSON

### Backend
- **PDF Parsing**: Robust text extraction from PDF documents
- **Rule Engine**: Fast pattern-based red flag detection for:
  - Offshore jurisdictions
  - Vague language and weasel words
  - High-risk phrases indicating deferred disclosures
  - Missing or incomplete schedules
  - Date anomalies (outdated audits)
  - Payment structure red flags
  - Liability limitations
  - Customer concentration risks
- **LLM Analysis**: Semantic analysis using open-source AI models for:
  - Contextual understanding beyond simple patterns
  - Detection of subtle issues
  - Comprehensive recommendations
- **Aggregation**: Smart deduplication and scoring system
- **Persistence**: Store and retrieve analysis results

## Red Flag Categories

1. **jurisdiction** - Governing law and dispute resolution concerns
2. **financial** - Payment terms, earnouts, financial audits
3. **legal** - Legal structure and compliance
4. **operational** - Business operations issues
5. **compliance** - Regulatory and compliance risks
6. **vague_language** - Ambiguous or undefined terms
7. **missing_info** - Deferred or incomplete disclosures
8. **liability** - Liability caps and indemnification
9. **intellectual_property** - IP rights and transfer issues
10. **tax** - Tax-related concerns
11. **employee** - Key personnel and employment matters
12. **customer** - Customer concentration and retention
13. **other** - Other material concerns

## Severity Levels

- **CRITICAL** (Score 9-10): Immediate attention required, deal-breaker issues
- **HIGH** (Score 7-8): Significant concerns that should be addressed
- **MEDIUM** (Score 4-6): Moderate risks worth investigating
- **LOW** (Score 1-3): Minor issues or informational alerts

## Usage

### 1. Access the Application
Navigate to `http://localhost:3000` in your browser

### 2. Upload a PDF
- Drag and drop a PDF file onto the upload area, or
- Click to browse and select a PDF file

### 3. View Analysis
The system will automatically:
1. Extract text from the PDF
2. Run rule-based pattern matching
3. Perform AI-powered semantic analysis
4. Aggregate and score findings

### 4. Review Results
- **Risk Score**: Overall risk assessment (0-10)
- **Severity Breakdown**: Count of flags by severity level
- **Detailed Findings**: Each red flag with:
  - Title and description
  - Contract context/quote
  - Recommendation for remediation
  - Risk score

### 5. Filter and Search
- Filter by severity level (Critical, High, Medium, Low)
- Filter by category (13 different categories)
- Search by keyword in titles and descriptions

### 6. Export Results
Click "Export Full Report" to download the complete analysis as JSON

## Technical Details

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **UI Library**: shadcn/ui (Radix UI components)
- **Styling**: Tailwind CSS 4
- **Database**: Prisma ORM with SQLite
- **AI/ML**: z-ai-web-dev-sdk with open-source models
- **PDF Parsing**: pdf-parse
- **State Management**: React hooks

### Key Files

```
src/
├── app/
│   ├── page.tsx                          # Main frontend component
│   └── api/
│       └── diligence/
│           └── analyze/
│               └── route.ts              # API endpoint
├── lib/
│   └── diligence/
│       ├── pdf-parser.ts                 # PDF text extraction
│       ├── rule-engine.ts               # Pattern-based analysis
│       ├── llm-analyzer.ts              # AI-powered analysis
│       ├── aggregator.ts                # Result aggregation
│       └── database.ts                 # Database operations
└── components/
    └── ui/                              # shadcn/ui components

prisma/
└── schema.prisma                        # Database schema
```

### Environment Variables

No API keys required! The system uses open-source models via z-ai-web-dev-sdk.

Optional:
- `DATABASE_URL` - SQLite database path (default: file:./dev.db)
- `AI_SDK_API_KEY` - SDK API key if needed

## Migration from Original Code

### Python → TypeScript
- Python backend migrated to Next.js API routes
- Type hints converted to TypeScript interfaces
- Async/await patterns preserved
- Regular expressions ported directly

### API Replacements
- `openai` library → z-ai-web-dev-sdk (LLM)
- `anthropic` library → z-ai-web-dev-sdk (LLM)
- `pymupdf` → pdf-parse
- Custom config → Next.js configuration

### Features Preserved
- ✅ All rule-based checks (offshore, weasel words, etc.)
- ✅ LLM prompt engineering
- ✅ Deduplication logic
- ✅ Risk scoring algorithm
- ✅ Severity categorization

### Improvements Made
- 🚀 Modern React/Next.js frontend
- 🚀 Better error handling and resilience
- 🚀 Real-time progress updates
- 🚀 Persistent storage with Prisma
- 🚀 Responsive mobile design
- 🚀 Advanced filtering capabilities

## Database Schema

### DiligenceAnalysis
```typescript
{
  id: string
  documentName: string
  totalFlags: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  overallRiskScore: number
  processingTimeSeconds: number
  createdAt: DateTime
}
```

### RedFlag
```typescript
{
  id: string
  category: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  location: string
  score: number
  source: string // 'rule_engine' | 'llm_analyzer'
  recommendation: string?
  createdAt: DateTime
  analysisId: string
}
```

## Development

### Install Dependencies
```bash
bun install
```

### Run Development Server
```bash
bun run dev
```

### Database Operations
```bash
# Push schema changes
bun run db:push

# Generate Prisma client
bun run db:generate

# Run migrations
bun run db:migrate
```

### Linting
```bash
bun run lint
```

## Troubleshooting

### LLM Analysis Returns Empty
- Check that z-ai-web-dev-sdk is properly configured
- Ensure network connectivity to AI services
- Review server logs for error messages

### PDF Parsing Fails
- Ensure PDF is not password protected
- Check that file size is under 50MB
- Verify PDF is not corrupted

### Database Errors
- Run `bun run db:push` to ensure schema is up to date
- Check database file permissions
- Review Prisma logs for specific errors

## Future Enhancements

Potential areas for improvement:
- [ ] Batch analysis for multiple documents
- [ ] Comparison mode to flag differences between documents
- [ ] Export to PDF/Word reports
- [ ] Historical analysis tracking
- [ ] User authentication and analysis history
- [ ] Custom rule configuration
- [ ] Integration with document management systems
- [ ] Advanced visualizations and charts
- [ ] Collaboration features for team reviews

## License

This project is proprietary and confidential. All rights reserved.

## Support

For issues or questions, contact the development team.
