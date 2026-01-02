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

const ANALYSIS_PROMPT = `You are an expert M&A attorney reviewing a contract section for red flags.

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

JSON response:`;

function generateId(): string {
  return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function chunkText(text: string, maxChars: number = 15000): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split by paragraphs to avoid breaking mid-sentence
  const paragraphs = text.split('\n\n');

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = para;
    } else {
      currentChunk += currentChunk ? '\n\n' + para : para;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function callLLM(prompt: string): Promise<any> {
  try {
    // Using z-ai-web-dev-sdk for LLM analysis
    // This uses open-source models instead of OpenAI/Anthropic
    const { LLM } = await import('z-ai-web-dev-sdk');

    // Create an LLM client instance
    const llm = new LLM({
      apiKey: process.env.AI_SDK_API_KEY || ''
    });

    // Call the LLM with the prompt
    const response = await llm.chat({
      messages: [
        {
          role: 'system',
          content: 'You are an expert M&A attorney. You always respond with valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      maxTokens: 2000,
      model: 'open-source' // Use open-source models
    });

    // Parse the response
    const responseText = response.content || response.message?.content || '';

    // Clean response (sometimes LLMs wrap JSON in markdown)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    // Parse JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('LLM call error:', error);
    // Return empty array on error to allow analysis to continue
    return [];
  }
}

async function analyzeChunk(chunk: string, chunkIndex: number): Promise<RedFlag[]> {
  try {
    console.log(`  Analyzing chunk ${chunkIndex + 1} (${chunk.length} characters)`);

    const prompt = ANALYSIS_PROMPT.replace('{text}', chunk);

    const response = await callLLM(prompt);

    // Handle different response formats
    let flagsArray: any[] = [];

    if (Array.isArray(response)) {
      flagsArray = response;
    } else if (response && response.flags && Array.isArray(response.flags)) {
      flagsArray = response.flags;
    } else if (response && typeof response === 'object') {
      flagsArray = [response];
    }

    // Convert to our RedFlag format
    const flags: RedFlag[] = [];

    for (const item of flagsArray) {
      try {
        flags.push({
          id: generateId(),
          category: item.category || 'other',
          severity: item.severity || 'MEDIUM',
          title: item.title || 'Unspecified Issue',
          description: item.description || '',
          location: (item.quote || item.location || '').substring(0, 500),
          score: Math.min(10, Math.max(1, parseInt(item.score) || 5)),
          source: 'llm_analyzer',
          recommendation: item.recommendation
        });
      } catch (err) {
        console.error('Failed to parse individual flag:', err);
      }
    }

    console.log(`  Chunk ${chunkIndex + 1} found ${flags.length} flags`);

    return flags;
  } catch (error) {
    console.error(`Error analyzing chunk ${chunkIndex}:`, error);
    return [];
  }
}

export async function analyzeWithLLM(text: string): Promise<RedFlag[]> {
  console.log('Running LLM-based analysis...');

  try {
    // Split text into manageable chunks
    const chunks = chunkText(text, 15000);
    console.log(`Text split into ${chunks.length} chunks for LLM analysis`);

    // Analyze chunks sequentially (to avoid overwhelming the API)
    const allFlags: RedFlag[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const flags = await analyzeChunk(chunks[i], i);
      allFlags.push(...flags);

      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`LLM analyzer found ${allFlags.length} red flags`);

    return allFlags;
  } catch (error) {
    console.error('LLM analysis error:', error);
    // Return empty array on error to allow the analysis to continue with rule-based flags only
    return [];
  }
}
