// Types
export interface RedFlag {
  id: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  location: string;
  score: number;
  source: string;
  recommendation?: string;
}

export interface AnalysisResult {
  id: string;
  documentName: string;
  analyzedAt: string;
  totalFlags: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overallRiskScore: number;
  flags: RedFlag[];
  processingTimeSeconds: number;
}

function getFlagKey(flag: RedFlag): string {
  // Use title and first 100 chars of description for similarity comparison
  return `${flag.title.toLowerCase()}|${flag.description.substring(0, 100).toLowerCase()}`;
}

function areSimilar(key1: string, key2: string, threshold: number = 0.7): boolean {
  // Simple word overlap check
  const words1 = new Set(key1.split(/\s+/));
  const words2 = new Set(key2.split(/\s+/));

  if (words1.size === 0 || words2.size === 0) {
    return false;
  }

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const overlap = intersection.size;
  const unionSize = union.size;

  const similarity = unionSize > 0 ? overlap / unionSize : 0;

  return similarity >= threshold;
}

function deduplicateFlags(flags: RedFlag[], similarityThreshold: number = 0.7): RedFlag[] {
  if (!flags || flags.length === 0) {
    return [];
  }

  // Group by category
  const byCategory: Record<string, RedFlag[]> = {};

  for (const flag of flags) {
    if (!byCategory[flag.category]) {
      byCategory[flag.category] = [];
    }
    byCategory[flag.category].push(flag);
  }

  const deduplicated: RedFlag[] = [];

  for (const [category, categoryFlags] of Object.entries(byCategory)) {
    const seenSimilar: Set<string> = new Set();

    for (const flag of categoryFlags) {
      // Check if similar to any already added
      let isDuplicate = false;
      const flagKey = getFlagKey(flag);

      for (const seenKey of seenSimilar) {
        if (areSimilar(flagKey, seenKey, similarityThreshold)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        deduplicated.push(flag);
        seenSimilar.add(flagKey);
      }
    }
  }

  return deduplicated;
}

function countBySeverity(flags: RedFlag[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const flag of flags) {
    switch (flag.severity) {
      case 'CRITICAL':
        counts.critical++;
        break;
      case 'HIGH':
        counts.high++;
        break;
      case 'MEDIUM':
        counts.medium++;
        break;
      case 'LOW':
        counts.low++;
        break;
    }
  }

  return counts;
}

function calculateRiskScore(flags: RedFlag[]): number {
  if (!flags || flags.length === 0) {
    return 0.0;
  }

  // Weighted average based on severity
  const severityWeights = {
    CRITICAL: 10,
    HIGH: 5,
    MEDIUM: 2,
    LOW: 1
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const flag of flags) {
    const weight = severityWeights[flag.severity] || 1;
    weightedSum += flag.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0.0;
  }

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function aggregateResults(
  documentName: string,
  ruleFlags: RedFlag[],
  llmFlags: RedFlag[],
  processingTime: number
): AnalysisResult {
  console.log('Aggregating results...');

  // Combine all flags
  const allFlags = [...(ruleFlags || []), ...(llmFlags || [])];

  // Deduplicate similar flags
  const deduplicated = deduplicateFlags(allFlags, 0.7);
  console.log(`  Deduplication: ${allFlags.length} -> ${deduplicated.length} flags`);

  // Sort by severity then score (highest first)
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  deduplicated.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.score - a.score; // Higher score first
  });

  // Calculate counts
  const severityCounts = countBySeverity(deduplicated);

  // Calculate overall risk score
  const riskScore = calculateRiskScore(deduplicated);

  // Generate ID
  const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    documentName,
    analyzedAt: new Date().toISOString(),
    totalFlags: deduplicated.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    overallRiskScore: riskScore,
    flags: deduplicated,
    processingTimeSeconds: Math.round(processingTime * 100) / 100
  };
}

export function generateSummary(result: AnalysisResult): string {
  const riskLevel = getRiskLevel(result.overallRiskScore);

  return `
=== M&A DUE DILIGENCE ANALYSIS ===
Document: ${result.documentName}
Analyzed: ${new Date(result.analyzedAt).toLocaleString()}
Processing Time: ${result.processingTimeSeconds}s

OVERALL RISK: ${riskLevel} (${result.overallRiskScore}/10)

FINDINGS SUMMARY:
- CRITICAL: ${result.criticalCount}
- HIGH: ${result.highCount}
- MEDIUM: ${result.mediumCount}
- LOW: ${result.lowCount}
- TOTAL: ${result.totalFlags}
`;
}

export function getRiskLevel(score: number): string {
  if (score >= 8) return 'EXTREME RISK';
  if (score >= 6) return 'HIGH RISK';
  if (score >= 4) return 'MODERATE RISK';
  if (score >= 2) return 'LOW RISK';
  return 'MINIMAL RISK';
}
