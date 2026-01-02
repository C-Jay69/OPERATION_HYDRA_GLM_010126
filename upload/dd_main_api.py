"""
FastAPI application for M&A Due Diligence Analyzer
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import time
from typing import Optional

from models.schemas import AnalysisResult, HealthResponse
from parsers.pdf_parser import PDFParser
from analyzers.rule_engine import RuleEngine
from analyzers.llm_analyzer import LLMAnalyzer
from analyzers.aggregator import ResultAggregator
from utils.config import get_settings
import asyncio


# Initialize FastAPI app
app = FastAPI(
    title="M&A Due Diligence Analyzer",
    description="AI-powered red flag detection for M&A contracts",
    version="0.1.0"
)

# CORS middleware (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "message": "M&A Due Diligence Analyzer API",
        "version": "0.1.0",
        "endpoints": {
            "analyze": "POST /analyze - Upload PDF for analysis",
            "health": "GET /health - Health check"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    settings = get_settings()
    
    # Check API key availability
    services = {
        "api": True,
        "anthropic": bool(settings.anthropic_api_key),
        "openai": bool(settings.openai_api_key)
    }
    
    status = "healthy" if all(services.values()) else "degraded"
    
    return HealthResponse(
        status=status,
        version="0.1.0",
        services=services
    )


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_document(
    file: UploadFile = File(...),
    use_claude: bool = True,
    use_gpt: bool = True,
    use_rules: bool = True
):
    """
    Analyze M&A contract PDF for red flags
    
    Args:
        file: PDF file to analyze
        use_claude: Enable Claude analysis (default: True)
        use_gpt: Enable GPT-4 analysis (default: True)
        use_rules: Enable rule-based analysis (default: True)
        
    Returns:
        AnalysisResult with all detected red flags
    """
    start_time = time.time()
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Save uploaded file temporarily
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Step 1: Parse PDF
        print(f"[1/4] Parsing PDF: {file.filename}")
        parser = PDFParser()
        parsed_data = parser.parse(tmp_file_path)
        full_text = parsed_data["full_text"]
        
        # Step 2: Rule-based analysis (fast)
        rule_flags = []
        if use_rules:
            print(f"[2/4] Running rule-based checks...")
            rule_engine = RuleEngine()
            rule_flags = rule_engine.analyze(full_text)
            print(f"  → Found {len(rule_flags)} rule-based flags")
        
        # Step 3: LLM analysis (parallel)
        llm_flags = []
        if use_claude or use_gpt:
            print(f"[3/4] Running LLM analysis (Claude: {use_claude}, GPT: {use_gpt})...")
            llm_analyzer = LLMAnalyzer()
            llm_flags = await llm_analyzer.analyze(full_text, use_claude, use_gpt)
            print(f"  → Found {len(llm_flags)} LLM flags")
        
        # Step 4: Aggregate results
        print(f"[4/4] Aggregating results...")
        aggregator = ResultAggregator()
        processing_time = time.time() - start_time
        
        result = aggregator.aggregate(
            document_name=file.filename,
            rule_flags=rule_flags,
            llm_flags=llm_flags,
            processing_time=processing_time
        )
        
        print(f"✓ Analysis complete: {result.total_flags} flags in {processing_time:.2f}s")
        print(aggregator.generate_summary(result))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)


@app.post("/analyze/batch")
async def analyze_batch(files: list[UploadFile] = File(...)):
    """
    Analyze multiple PDF files
    
    Note: This is a simple sequential implementation.
    For production, implement proper queuing (Celery, etc.)
    """
    results = []
    
    for file in files:
        try:
            result = await analyze_document(file)
            results.append({
                "filename": file.filename,
                "status": "success",
                "result": result
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "failed",
                "error": str(e)
            })
    
    return {"results": results}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)