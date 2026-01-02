"""
Rule-based analyzer for fast, deterministic red flag detection
"""
import re
from typing import List, Dict, Any
from models.schemas import RedFlag, SeverityLevel, FlagCategory
from utils.config import OFFSHORE_JURISDICTIONS, WEASEL_WORDS, HIGH_RISK_PHRASES


class RuleEngine:
    """Fast rule-based checks before expensive LLM calls"""
    
    def __init__(self):
        self.flags: List[RedFlag] = []
    
    def analyze(self, full_text: str) -> List[RedFlag]:
        """Run all rule-based checks"""
        self.flags = []
        
        # Run all checks
        self._check_offshore_jurisdictions(full_text)
        self._check_weasel_words(full_text)
        self._check_high_risk_phrases(full_text)
        self._check_missing_schedules(full_text)
        self._check_date_anomalies(full_text)
        self._check_payment_red_flags(full_text)
        self._check_liability_limitations(full_text)
        self._check_customer_concentration(full_text)
        
        return self.flags
    
    def _check_offshore_jurisdictions(self, text: str):
        """Flag offshore jurisdiction clauses"""
        for jurisdiction in OFFSHORE_JURISDICTIONS:
            pattern = rf'\b{re.escape(jurisdiction)}\b'
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            
            for match in matches:
                context = self._get_context(text, match.start(), match.end())
                
                # Higher severity if in governing law or arbitration section
                severity = SeverityLevel.CRITICAL if any(
                    keyword in context.lower() 
                    for keyword in ["governing law", "arbitration", "dispute resolution"]
                ) else SeverityLevel.HIGH
                
                self.flags.append(RedFlag(
                    category=FlagCategory.JURISDICTION,
                    severity=severity,
                    title=f"Offshore Jurisdiction: {jurisdiction}",
                    description=f"Document references {jurisdiction}, which may indicate jurisdiction shopping or regulatory arbitrage.",
                    location=context,
                    score=9 if severity == SeverityLevel.CRITICAL else 7,
                    source="rule_engine",
                    recommendation="Require arbitration in neutral jurisdiction (Delaware, New York, or London). Investigate why offshore jurisdiction was chosen."
                ))
    
    def _check_weasel_words(self, text: str):
        """Flag vague, non-committal language"""
        weasel_count = {}
        
        for word in WEASEL_WORDS:
            pattern = rf'\b{re.escape(word)}\b'
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            
            if matches:
                weasel_count[word] = len(matches)
                
                # Only flag if excessive (more than 3 uses)
                if len(matches) > 3:
                    first_match = matches[0]
                    context = self._get_context(text, first_match.start(), first_match.end())
                    
                    self.flags.append(RedFlag(
                        category=FlagCategory.VAGUE_LANGUAGE,
                        severity=SeverityLevel.MEDIUM,
                        title=f"Excessive Vague Language: '{word}' ({len(matches)}x)",
                        description=f"Term '{word}' appears {len(matches)} times. Vague language creates ambiguity and potential for disputes.",
                        location=context,
                        score=5,
                        source="rule_engine",
                        recommendation=f"Request specific definitions and thresholds. Replace '{word}' with measurable criteria."
                    ))
    
    def _check_high_risk_phrases(self, text: str):
        """Flag phrases indicating incomplete or deferred disclosures"""
        for phrase in HIGH_RISK_PHRASES:
            pattern = rf'\b{re.escape(phrase)}\b'
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            
            for match in matches:
                context = self._get_context(text, match.start(), match.end())
                
                self.flags.append(RedFlag(
                    category=FlagCategory.MISSING_INFO,
                    severity=SeverityLevel.HIGH,
                    title=f"Deferred Disclosure: '{phrase}'",
                    description="Critical information is deferred or incomplete. This is a major red flag - you're signing before having full information.",
                    location=context,
                    score=8,
                    source="rule_engine",
                    recommendation="STOP. Do not sign until all referenced information is provided and reviewed. No post-closing surprises."
                ))
    
    def _check_missing_schedules(self, text: str):
        """Flag references to missing schedules/exhibits"""
        # Find all schedule references
        schedule_pattern = r'Schedule\s+([A-Z0-9]+(?:\([a-z0-9]+\))?)'
        referenced_schedules = set(re.findall(schedule_pattern, text, re.IGNORECASE))
        
        # Look for phrases indicating schedules are missing
        missing_indicators = [
            "being finalized", "to be provided", "being compiled",
            "will be attached", "to be determined"
        ]
        
        for indicator in missing_indicators:
            if indicator in text.lower():
                context_match = re.search(rf'.{{0,100}}{indicator}.{{0,100}}', text, re.IGNORECASE)
                if context_match:
                    self.flags.append(RedFlag(
                        category=FlagCategory.MISSING_INFO,
                        severity=SeverityLevel.CRITICAL,
                        title="Missing or Incomplete Schedules",
                        description=f"Schedules are incomplete: '{indicator}'. Never sign with missing schedules.",
                        location=context_match.group(0),
                        score=10,
                        source="rule_engine",
                        recommendation="Require all schedules to be completed and attached before signing. Missing schedules = unknown liabilities."
                    ))
                    break  # Only flag once
    
    def _check_date_anomalies(self, text: str):
        """Flag suspicious dates (very old audits, future dates, etc.)"""
        # Look for audit dates
        audit_pattern = r'audit(?:ed)?[^.]{0,50}(?:19|20)(\d{2})'
        matches = re.finditer(audit_pattern, text, re.IGNORECASE)
        
        for match in matches:
            year = int(match.group(1))
            full_year = 1900 + year if year > 50 else 2000 + year
            
            # Flag audits older than 2 years
            if full_year < 2023:
                context = self._get_context(text, match.start(), match.end())
                self.flags.append(RedFlag(
                    category=FlagCategory.FINANCIAL,
                    severity=SeverityLevel.HIGH,
                    title=f"Outdated Financial Audit ({full_year})",
                    description=f"Most recent audit mentioned is from {full_year}, which is too old to be reliable.",
                    location=context,
                    score=7,
                    source="rule_engine",
                    recommendation="Require current audited financials (within 12 months). Outdated audits hide recent problems."
                ))
    
    def _check_payment_red_flags(self, text: str):
        """Flag suspicious payment structures"""
        red_flags = {
            "earnout.*(?:undefined|to be determined|mutually agreed)": {
                "title": "Undefined Earnout Targets",
                "severity": SeverityLevel.CRITICAL,
                "score": 10,
                "recommendation": "Never accept undefined earnout metrics. Specify exact EBITDA/revenue targets and calculation methods."
            },
            "deferred.*(?:performance metrics|to be determined)": {
                "title": "Undefined Deferred Payment Terms",
                "severity": SeverityLevel.HIGH,
                "score": 8,
                "recommendation": "All deferred payment triggers must be clearly defined at signing."
            }
        }
        
        for pattern, flag_info in red_flags.items():
            matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                context = self._get_context(text, match.start(), match.end())
                self.flags.append(RedFlag(
                    category=FlagCategory.FINANCIAL,
                    severity=flag_info["severity"],
                    title=flag_info["title"],
                    description="Payment terms are incomplete or subject to future agreement. This creates massive dispute risk.",
                    location=context,
                    score=flag_info["score"],
                    source="rule_engine",
                    recommendation=flag_info["recommendation"]
                ))
    
    def _check_liability_limitations(self, text: str):
        """Flag aggressive liability caps or limitations"""
        # Look for indemnification survival periods
        survival_pattern = r'(?:surviv|representations).*?(\d+)\s*(?:months?|days?)'
        matches = re.finditer(survival_pattern, text, re.IGNORECASE)
        
        for match in matches:
            period = int(match.group(1))
            if period < 12:  # Less than 12 months is suspicious
                context = self._get_context(text, match.start(), match.end())
                self.flags.append(RedFlag(
                    category=FlagCategory.LIABILITY,
                    severity=SeverityLevel.HIGH,
                    title=f"Short Survival Period ({period} months)",
                    description=f"Representations survive only {period} months. Industry standard is 18-24 months minimum.",
                    location=context,
                    score=7,
                    source="rule_engine",
                    recommendation=f"Negotiate longer survival period (minimum 18 months). {period} months is insufficient for most issues to surface."
                ))
    
    def _check_customer_concentration(self, text: str):
        """Flag high customer concentration risks"""
        # Look for patterns like "top 10 customers represent X%"
        concentration_pattern = r'top\s+\d+\s+customers?.*?(\d+)%'
        matches = re.finditer(concentration_pattern, text, re.IGNORECASE)
        
        for match in matches:
            percentage = int(match.group(1))
            if percentage > 50:
                context = self._get_context(text, match.start(), match.end())
                severity = SeverityLevel.CRITICAL if percentage > 70 else SeverityLevel.HIGH
                
                self.flags.append(RedFlag(
                    category=FlagCategory.CUSTOMER,
                    severity=severity,
                    title=f"High Customer Concentration ({percentage}%)",
                    description=f"Top customers represent {percentage}% of revenue. Loss of any major customer could be catastrophic.",
                    location=context,
                    score=9 if percentage > 70 else 7,
                    source="rule_engine",
                    recommendation="Require customer retention agreements, escrow protection, or earnout tied to customer retention."
                ))
    
    def _get_context(self, text: str, start: int, end: int, chars: int = 150) -> str:
        """Extract context around a match"""
        context_start = max(0, start - chars)
        context_end = min(len(text), end + chars)
        context = text[context_start:context_end].strip()
        
        if context_start > 0:
            context = "..." + context
        if context_end < len(text):
            context = context + "..."
        
        return context