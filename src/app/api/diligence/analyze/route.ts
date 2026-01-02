import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parsePDF } from '@/lib/diligence/pdf-parser';
import { analyzeWithRules } from '@/lib/diligence/rule-engine';
import { analyzeWithLLM } from '@/lib/diligence/llm-analyzer';
import { aggregateResults } from '@/lib/diligence/aggregator';
import { saveAnalysis } from '@/lib/diligence/database';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Save file temporarily
    const tempDir = join(process.cwd(), 'tmp');
    const tempFilePath = join(tempDir, `${uuidv4()}.pdf`);

    try {
      // Ensure tmp directory exists
      const fs = await import('fs');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(tempFilePath, buffer);

      const startTime = Date.now();

      // Step 1: Parse PDF
      const pdfText = await parsePDF(tempFilePath);
      console.log(`[1/4] PDF parsed: ${pdfText.length} characters`);

      // Step 2: Run rule-based analysis
      const ruleFlags = await analyzeWithRules(pdfText);
      console.log(`[2/4] Rule-based analysis: ${ruleFlags.length} flags found`);

      // Step 3: Run LLM analysis
      const llmFlags = await analyzeWithLLM(pdfText);
      console.log(`[3/4] LLM analysis: ${llmFlags.length} flags found`);

      // Step 4: Aggregate results
      const processingTime = (Date.now() - startTime) / 1000;
      const aggregatedResult = aggregateResults(
        file.name,
        ruleFlags,
        llmFlags,
        processingTime
      );
      console.log(`[4/4] Aggregation complete: ${aggregatedResult.totalFlags} total flags`);

      // Save to database
      await saveAnalysis(aggregatedResult);

      return NextResponse.json(aggregatedResult);

    } finally {
      // Clean up temp file
      try {
        await unlink(tempFilePath);
      } catch (error) {
        console.error('Error deleting temp file:', error);
      }
    }

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'M&A Due Diligence Analyzer API',
    version: '1.0.0',
    endpoints: {
      'POST /api/diligence/analyze': 'Upload PDF for analysis',
    },
  });
}
