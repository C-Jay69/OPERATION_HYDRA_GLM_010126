"""
LLM-based semantic analysis using Claude and GPT
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from openai import OpenAI
from models.schemas import RedFlag, SeverityLevel, FlagCategory
from utils.config import get_settings


class LLMAnalyzer:
    """Semantic analysis using Claude and GPT-4"""
    
    ANALYSIS_PROMPT = """You are an expert M&A attorney reviewing a contract section for red flags.

Analyze the following contract section and identify any red flags related to:
- Vague or undefined terms that create ambiguity
- Missing critical information or deferred disclosures
- Unusual liability limitations or indemnification gaps
- Suspicious payment structures or undefined earnout terms
- Jurisdiction or dispute resolution concerns
- Customer concentration or key person dependencies
- Tax, IP, compliance, or regulatory risks
- Any other material concerns

For EACH red flag you identify, return a JSON object with:
- category: one of [jurisdiction, financial, legal, operational, compliance, vague_language, missing_info, liability, intellectual_property, tax, employee, customer, other]
- severity: one of [CRITICAL, HIGH, MEDIUM, LOW]
- title: brief title (max 80 chars)
- description: explanation of why this is concerning (2-3 sentences)
- quote: exact text from the section that triggered this flag
- score: risk score from 1-10
- recommendation: specific action to take

Return ONLY a JSON array of red flags. If no red flags, return empty array [].

Contract section:
{text}

JSON response:"""
    
    def __init__(self):
        settings = get_settings()
        self.claude_client = Anthropic(api_key=settings.anthropic_api_key)
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
        self.settings = settings
    
    async def analyze(self, text: str, use_claude: bool = True, use_gpt: bool = True) -> List[RedFlag]:
        """
        Run parallel analysis with Claude and GPT
        
        Args:
            text: Contract text to analyze
            use_claude: Enable Claude analysis
            use_gpt: Enable GPT analysis
            
        Returns:
            List of RedFlags from both models
        """
        tasks = []
        
        if use_claude:
            tasks.append(self._analyze_with_claude(text))
        if use_gpt:
            tasks.append(self._analyze_with_gpt(text))
        
        if not tasks:
            return []
        
        # Run in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten results
        all_flags = []
        for result in results:
            if isinstance(result, Exception):
                print(f"LLM analysis error: {result}")
                continue
            if isinstance(result, list):
                all_flags.extend(result)
        
        return all_flags
    
    async def _analyze_with_claude(self, text: str) -> List[RedFlag]:
        """Analyze with Claude"""
        try:
            # Chunk text if too long (max ~100k tokens for Sonnet)
            chunks = self._chunk_text(text, max_chars=50000)
            all_flags = []
            
            for chunk in chunks:
                prompt = self.ANALYSIS_PROMPT.format(text=chunk)
                
                message = self.claude_client.messages.create(
                    model=self.settings.claude_model,
                    max_tokens=self.settings.max_tokens,
                    temperature=self.settings.temperature,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                # Parse response
                response_text = message.content[0].text
                flags = self._parse_llm_response(response_text, source="claude")
                all_flags.extend(flags)
            
            return all_flags
            
        except Exception as e:
            print(f"Claude analysis failed: {e}")
            return []
    
    async def _analyze_with_gpt(self, text: str) -> List[RedFlag]:
        """Analyze with GPT-4"""
        try:
            chunks = self._chunk_text(text, max_chars=50000)
            all_flags = []
            
            for chunk in chunks:
                prompt = self.ANALYSIS_PROMPT.format(text=chunk)
                
                response = self.openai_client.chat.completions.create(
                    model=self.settings.gpt_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.settings.temperature,
                    response_format={"type": "json_object"}
                )
                
                response_