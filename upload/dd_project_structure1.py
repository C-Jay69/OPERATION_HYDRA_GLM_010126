# M&A Due Diligence Analyzer - Project Structure
# 
# Create this directory structure:
#
# ma-diligence/
# ├── api/
# │   ├── __init__.py
# │   ├── main.py
# │   └── routes.py
# ├── analyzers/
# │   ├── __init__.py
# │   ├── rule_engine.py
# │   ├── llm_analyzer.py
# │   └── aggregator.py
# ├── parsers/
# │   ├── __init__.py
# │   └── pdf_parser.py
# ├── models/
# │   ├── __init__.py
# │   └── schemas.py
# ├── utils/
# │   ├── __init__.py
# │   └── config.py
# ├── tests/
# │   └── test_documents/
# ├── requirements.txt
# ├── .env
# └── README.md

# requirements.txt
"""
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pymupdf==1.23.8
anthropic==0.34.0
openai==1.3.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
aiohttp==3.9.1
"""

# .env (create this file with your actual keys)
"""
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
"""

# README.md
"""
# M&A Due Diligence Analyzer

## Setup
1. Create virtual environment: `python -m venv venv`
2. Activate: `source venv/bin/activate` (Linux/Mac) or `venv\\Scripts\\activate` (Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and add your API keys
5. Run: `uvicorn api.main:app --reload`
6. Test: `curl -X POST http://localhost:8000/analyze -F "file=@test.pdf"`

## API Endpoints
- POST /analyze - Upload PDF for analysis
- GET /health - Health check

## Architecture
1. PDF Parser extracts text with structure
2. Rule Engine runs fast, deterministic checks
3. LLM Analyzer sends flagged sections to Claude + GPT (parallel)
4. Aggregator merges findings, deduplicates, scores

## Testing
Place test PDFs in `tests/test_documents/` and run:
```python
python -m pytest tests/
```
"""

print("Project structure defined. Now creating the actual code files...")