"""
Test script to analyze a sample document without running the API
"""
import asyncio
import time
from parsers.pdf_parser import PDFParser
from analyzers.rule_engine import RuleEngine
from analyzers.llm_analyzer import LLMAnalyzer
from analyzers.aggregator import ResultAggregator


async def test_analysis(pdf_path: str):
    """Run complete analysis on a PDF file"""
    
    print(f"Analyzing: {pdf_path}\n")
    print("=" * 60)
    
    start_time = time.time()
    
    # Step 1: Parse PDF
    print("\n[1/4] Parsing PDF...")
    parser = PDFParser()
    parsed_data = parser.parse(pdf_path)
    full_text = parsed_data["full_text"]
    print(f"  → Extracted {len(full_text)} characters from {parsed_data['metadata']['page_count']} pages")
    
    # Step 2: Rule-based analysis
    print("\n[2/4] Running rule-based checks...")
    rule_engine = RuleEngine()
    rule_flags = rule_engine.analyze(full_text)
    print(f"  → Found {len(rule_flags)} rule-based flags")
    
    # Print rule flags
    if rule_flags:
        print("\n  Rule-based findings:")
        for flag in rule_flags[:5]:  # Show first 5
            print(f"    • [{flag.severity}] {flag.title}")
    
    # Step 3: LLM analysis
    print("\n[3/4] Running LLM analysis (this may take a minute)...")
    llm_analyzer = LLMAnalyzer()
    llm_flags = await llm_analyzer.analyze(full_text, use_claude=True, use_gpt=True)
    print(f"  → Found {len(llm_flags)} LLM flags")
    
    # Print LLM flags by source
    if llm_flags:
        claude_flags = [f for f in llm_flags if f.source == "claude"]
        gpt_flags = [f for f in llm_flags if f.source == "gpt4"]
        print(f"    - Claude: {len(claude_flags)} flags")
        print(f"    - GPT-4: {len(gpt_flags)} flags")
    
    # Step 4: Aggregate
    print("\n[4/4] Aggregating results...")
    aggregator = ResultAggregator()
    processing_time = time.time() - start_time
    
    result = aggregator.aggregate(
        document_name=pdf_path.split("/")[-1],
        rule_flags=rule_flags,
        llm_flags=llm_flags,
        processing_time=processing_time
    )
    
    # Print summary
    print("\n" + "=" * 60)
    print(aggregator.generate_summary(result))
    print("=" * 60)
    
    # Print detailed findings
    print("\nDETAILED FINDINGS:\n")
    for i, flag in enumerate(result.flags, 1):
        print(f"{i}. [{flag.severity}] {flag.title} (Score: {flag.score}/10)")
        print(f"   Category: {flag.category}")
        print(f"   Source: {flag.source}")
        print(f"   Description: {flag.description}")
        if flag.recommendation:
            print(f"   Recommendation: {flag.recommendation}")
        print(f"   Location: {flag.location[:200]}...")
        print()
    
    return result


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python test_analyzer.py <path_to_pdf>")
        print("\nExample: python test_analyzer.py tests/test_documents/sample_contract.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    # Run analysis
    result = asyncio.run(test_analysis(pdf_path))
    
    print(f"\n✓ Analysis complete!")
    print(f"  Total flags: {result.total_flags}")
    print(f"  Processing time: {result.processing_time_seconds}s")
    print(f"  Overall risk score: {result.overall_risk_score}/10")