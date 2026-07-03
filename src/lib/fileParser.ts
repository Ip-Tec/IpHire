'use client';

/**
 * Parse uploaded resume files (PDF, DOCX, TXT, MD) and extract plain text.
 * Runs entirely in the browser — no server round-trip needed.
 */

export async function parseResumeFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  switch (ext) {
    case 'txt':
    case 'md':
      return await file.text();

    case 'docx':
      return await parseDOCX(file);

    case 'pdf':
      return await parsePDF(file);

    default:
      throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, TXT, or MD file.`);
  }
}

async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.default.extractRawText({ arrayBuffer });
  return result.value;
}

async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source to use local worker copy
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

/** Supported file extensions for the upload button */
export const SUPPORTED_EXTENSIONS = '.pdf,.docx,.txt,.md';

/** Human-readable label */
export const SUPPORTED_LABEL = 'PDF, DOCX, TXT, or Markdown';
