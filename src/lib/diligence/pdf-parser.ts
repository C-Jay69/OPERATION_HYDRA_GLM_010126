import pdf from 'pdf-parse';

export async function parsePDF(filePath: string): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const dataBuffer = await fs.readFile(filePath);

    const data = await pdf(dataBuffer);

    // Extract full text
    const fullText = data.text;

    // Clean up text
    const cleanedText = fullText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page headers/footers (heuristic)
      .replace(/Page \d+ of \d+/gi, '')
      .replace(/^\s*\d+\s*$/gm, '')
      .trim();

    console.log(`PDF parsed: ${data.numpages} pages, ${cleanedText.length} characters`);

    return cleanedText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);

    // Extract and clean text
    const fullText = data.text;
    const cleanedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/Page \d+ of \d+/gi, '')
      .replace(/^\s*\d+\s*$/gm, '')
      .trim();

    return cleanedText;
  } catch (error) {
    console.error('PDF buffer parsing error:', error);
    throw new Error(`Failed to parse PDF buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
