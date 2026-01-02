import { db } from '@/lib/db';
import type { RedFlag as RedFlagInput, AnalysisResult as AnalysisResultInput } from './aggregator';

// Convert our AnalysisResult to Prisma format
export async function saveAnalysis(result: AnalysisResultInput): Promise<void> {
  try {
    console.log('Saving analysis to database...');

    // Create the analysis record
    const analysis = await db.diligenceAnalysis.create({
      data: {
        id: result.id,
        documentName: result.documentName,
        totalFlags: result.totalFlags,
        criticalCount: result.criticalCount,
        highCount: result.highCount,
        mediumCount: result.mediumCount,
        lowCount: result.lowCount,
        overallRiskScore: result.overallRiskScore,
        processingTimeSeconds: result.processingTimeSeconds,
        flags: {
          create: result.flags.map(flag => ({
            id: flag.id,
            category: flag.category,
            severity: flag.severity,
            title: flag.title,
            description: flag.description,
            location: flag.location,
            score: flag.score,
            source: flag.source,
            recommendation: flag.recommendation
          }))
        }
      }
    });

    console.log(`Analysis saved with ID: ${analysis.id}`);
  } catch (error) {
    console.error('Error saving analysis to database:', error);
    // Don't throw - we don't want database errors to fail the entire analysis
  }
}

export async function getAnalysis(id: string): Promise<AnalysisResultInput | null> {
  try {
    const analysis = await db.diligenceAnalysis.findUnique({
      where: { id },
      include: { flags: true }
    });

    if (!analysis) {
      return null;
    }

    // Convert from Prisma format to our format
    return {
      id: analysis.id,
      documentName: analysis.documentName,
      analyzedAt: analysis.createdAt.toISOString(),
      totalFlags: analysis.totalFlags,
      criticalCount: analysis.criticalCount,
      highCount: analysis.highCount,
      mediumCount: analysis.mediumCount,
      lowCount: analysis.lowCount,
      overallRiskScore: analysis.overallRiskScore,
      processingTimeSeconds: analysis.processingTimeSeconds,
      flags: analysis.flags.map(flag => ({
        id: flag.id,
        category: flag.category,
        severity: flag.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        title: flag.title,
        description: flag.description,
        location: flag.location,
        score: flag.score,
        source: flag.source,
        recommendation: flag.recommendation || undefined
      }))
    };
  } catch (error) {
    console.error('Error retrieving analysis from database:', error);
    return null;
  }
}

export async function listAnalyses(limit: number = 10, offset: number = 0): Promise<AnalysisResultInput[]> {
  try {
    const analyses = await db.diligenceAnalysis.findMany({
      include: { flags: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return analyses.map(analysis => ({
      id: analysis.id,
      documentName: analysis.documentName,
      analyzedAt: analysis.createdAt.toISOString(),
      totalFlags: analysis.totalFlags,
      criticalCount: analysis.criticalCount,
      highCount: analysis.highCount,
      mediumCount: analysis.mediumCount,
      lowCount: analysis.lowCount,
      overallRiskScore: analysis.overallRiskScore,
      processingTimeSeconds: analysis.processingTimeSeconds,
      flags: analysis.flags.map(flag => ({
        id: flag.id,
        category: flag.category,
        severity: flag.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        title: flag.title,
        description: flag.description,
        location: flag.location,
        score: flag.score,
        source: flag.source,
        recommendation: flag.recommendation || undefined
      }))
    }));
  } catch (error) {
    console.error('Error listing analyses from database:', error);
    return [];
  }
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    await db.diligenceAnalysis.delete({
      where: { id }
    });

    console.log(`Analysis deleted: ${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return false;
  }
}
