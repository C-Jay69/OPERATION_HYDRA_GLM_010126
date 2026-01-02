"""
Aggregate, deduplicate, and score findings from multiple analyzers
"""
from typing import List, Dict, Any
from collections import defaultdict
from models.schemas import RedFlag, SeverityLevel, AnalysisResult
from datetime import datetime


class ResultAggregator:
    """Combine findings from rule engine and LLMs"""
    
    def __init__(self):
        self.similarity_threshold = 0.7  # How similar for deduplication
    
    def aggregate(
        self,
        document_name: str,
        rule_flags: List[RedFlag],
        llm_flags: List[RedFlag],
        processing_time: float
    ) -> AnalysisResult:
        """
        Aggregate all findings into final report
        
        Args:
            document_name: Name of analyzed document
            rule_flags: Flags from rule engine
            llm_flags: Flags from LLM analyzers
            processing_time: Total processing time in seconds
            
        Returns:
            Complete AnalysisResult
        """
        # Combine all flags
        all_flags = rule_flags + llm_flags
        
        # Deduplicate similar flags
        deduplicated = self._deduplicate_flags(all_flags)
        
        # Sort by severity then score
        severity_order = {
            SeverityLevel.CRITICAL: 0,
            SeverityLevel.HIGH: 1,
            SeverityLevel.MEDIUM: 2,
            SeverityLevel.LOW: 3
        }
        deduplicated.sort(key=lambda f: (severity_order[f.severity], -f.score))
        
        # Calculate counts
        severity_counts = self._count_by_severity(deduplicated)
        
        # Calculate overall risk score (weighted average)
        risk_score = self._calculate_risk_score(deduplicated)
        
        return AnalysisResult(
            document_name=document_name,
            analyzed_at=datetime.now(),
            total_flags=len(deduplicated),
            critical_count=severity_counts[SeverityLevel.CRITICAL],
            high_count=severity_counts[SeverityLevel.HIGH],
            medium_count=severity_counts[SeverityLevel.MEDIUM],
            low_count=severity_counts[SeverityLevel.LOW],
            overall_risk_score=risk_score,
            flags=deduplicated,
            processing_time_seconds=round(processing_time, 2),
            metadata={
                "rule_flags_count": len(rule_flags),
                "llm_flags_count": len(llm_flags),
                "deduplication_removed": len(all_flags) - len(deduplicated)
            }
        )
    
    def _deduplicate_flags(self, flags: List[RedFlag]) -> List[RedFlag]:
        """
        Remove duplicate or very similar flags
        
        Strategy:
        1. Group by category
        2. Within category, find similar titles/descriptions
        3. Keep the one with highest confidence (rule > claude > gpt)
        """
        if not flags:
            return []
        
        # Group by category
        by_category: Dict[str, List[RedFlag]] = defaultdict(list)
        for flag in flags:
            by_category[flag.category].append(flag)
        
        deduplicated = []
        
        for category, category_flags in by_category.items():
            seen_similar = set()
            
            for flag in category_flags:
                # Check if similar to any already added
                is_duplicate = False
                flag_key = self._get_flag_key(flag)
                
                for seen_key in seen_similar:
                    if self._are_similar(flag_key, seen_key):
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    deduplicated.append(flag)
                    seen_similar.add(flag_key)
        
        return deduplicated
    
    def _get_flag_key(self, flag: RedFlag) -> str:
        """Generate a key for similarity comparison"""
        # Use title and first 100 chars of description
        return f"{flag.title.lower()}|{flag.description[:100].lower()}"
    
    def _are_similar(self, key1: str, key2: str) -> bool:
        """Check if two flag keys are similar (simple approach)"""
        # Simple word overlap check
        words1 = set(key1.split())
        words2 = set(key2.split())
        
        if not words1 or not words2:
            return False
        
        overlap = len(words1 & words2)
        union = len(words1 | words2)
        
        similarity = overlap / union if union > 0 else 0
        return similarity >= self.similarity_threshold
    
    def _count_by_severity(self, flags: List[RedFlag]) -> Dict[SeverityLevel, int]:
        """Count flags by severity level"""
        counts = {
            SeverityLevel.CRITICAL: 0,
            SeverityLevel.HIGH: 0,
            SeverityLevel.MEDIUM: 0,
            SeverityLevel.LOW: 0
        }
        
        for flag in flags:
            counts[flag.severity] += 1
        
        return counts
    
    def _calculate_risk_score(self, flags: List[RedFlag]) -> float:
        """
        Calculate overall risk score (0-10)
        
        Weighted by severity:
        - CRITICAL: 10x weight
        - HIGH: 5x weight
        - MEDIUM: 2x weight
        - LOW: 1x weight
        """
        if not flags:
            return 0.0
        
        severity_weights = {
            SeverityLevel.CRITICAL: 10,
            SeverityLevel.HIGH: 5,
            SeverityLevel.MEDIUM: 2,
            SeverityLevel.LOW: 1
        }
        
        weighted_sum = 0
        total_weight = 0
        
        for flag in flags:
            weight = severity_weights[flag.severity]
            weighted_sum += flag.score * weight
            total_weight += weight
        
        if total_weight == 0:
            return 0.0
        
        return round(weighted_sum / total_weight, 2)
    
    def generate_summary(self, result: AnalysisResult) -> str:
        """Generate human-readable summary"""
        risk_level = self._get_risk_level(result.overall_risk_score)
        
        summary = f"""
=== M&A DUE DILIGENCE ANALYSIS ===
Document: {result.document_name}
Analyzed: {result.analyzed_at.strftime('%Y-%m-%d %H:%M:%S')}
Processing Time: {result.processing_time_seconds}s

OVERALL RISK: {risk_level} ({result.overall_risk_score}/10)

FINDINGS SUMMARY:
- CRITICAL: {result.critical_count}
- HIGH: {result.high_count}
- MEDIUM: {result.medium_count}
- LOW: {result.low_count}
- TOTAL: {result.total_flags}

"""
        
        # Add top 5 most critical issues
        if result.flags:
            summary += "TOP CONCERNS:\n"
            for i, flag in enumerate(result.flags[:5], 1):
                summary += f"\n{i}. [{flag.severity}] {flag.title}\n"
                summary += f"   {flag.description[:150]}...\n"
        
        return summary
    
    def _get_risk_level(self, score: float) -> str:
        """Convert numeric score to risk level"""
        if score >= 8:
            return "EXTREME RISK"
        elif score >= 6:
            return "HIGH RISK"
        elif score >= 4:
            return "MODERATE RISK"
        elif score >= 2:
            return "LOW RISK"
        else:
            return "MINIMAL RISK"