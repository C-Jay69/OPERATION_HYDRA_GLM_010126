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
                response_text = response.choices[0].message.content
                flags = self._parse_llm_response(response_text, source="gpt4")
                all_flags.extend(flags)
            
            return all_flags
            
        except Exception as e:
            print(f"GPT analysis failed: {e}")
            return []
    
    def _chunk_text(self, text: str, max_chars: int = 50000) -> List[str]:
        """Split text into manageable chunks"""
        if len(text) <= max_chars:
            return [text]
        
        chunks = []
        current_chunk = ""
        
        # Split by paragraphs to avoid breaking mid-sentence
        paragraphs = text.split('\n\n')
        
        for para in paragraphs:
            if len(current_chunk) + len(para) > max_chars:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para
            else:
                current_chunk += "\n\n" + para if current_chunk else para
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _parse_llm_response(self, response_text: str, source: str) -> List[RedFlag]:
        """Parse JSON response from LLM into RedFlag objects"""
        try:
            # Clean response (sometimes LLMs wrap JSON in markdown)
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse JSON
            data = json.loads(response_text)
            
            # Handle both array and object with "flags" key
            if isinstance(data, dict) and "flags" in data:
                data = data["flags"]
            
            if not isinstance(data, list):
                print(f"Unexpected response format from {source}: {type(data)}")
                return []
            
            flags = []
            for item in data:
                try:
                    # Map to our schema
                    flag = RedFlag(
                        category=FlagCategory(item.get("category", "other")),
                        severity=SeverityLevel(item.get("severity", "MEDIUM")),
                        title=item.get("title", "Unspecified Issue"),
                        description=item.get("description", ""),
                        location=item.get("quote", item.get("location", ""))[:500],  # Limit length
                        score=int(item.get("score", 5)),
                        source=source,
                        recommendation=item.get("recommendation")
                    )
                    flags.append(flag)
                except Exception as e:
                    print(f"Failed to parse individual flag from {source}: {e}")
                    continue
            
            return flags
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON from {source}: {e}")
            print(f"Response was: {response_text[:500]}")
            return []
        except Exception as e:
            print(f"Error parsing {source} response: {e}")
            return []


# Sync wrapper for backward compatibility
def analyze_with_llm(text: str, use_claude: bool = True, use_gpt: bool = True) -> List[RedFlag]:
    """Synchronous wrapper for LLM analysis"""
    analyzer = LLMAnalyzer()
    return asyncio.run(analyzer.analyze(text, use_claude, use_gpt))text = message.content[0].text
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