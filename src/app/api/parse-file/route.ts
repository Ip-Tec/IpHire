import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Note: In Next.js API routes, pdfjs might complain about missing worker, 
// but we only extract text so we can disable the worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
      const uint8Array = new Uint8Array(buffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array, standardFontDataUrl: '' }).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      text = fullText;
    } else if (file.name.endsWith(".docx") || file.type.includes("wordprocessingml.document")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.endsWith(".txt") || file.type.startsWith("text/")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ success: false, error: "Unsupported file type. Use PDF, DOCX, or TXT." }, { status: 400 });
    }

    return NextResponse.json({ success: true, text: text.trim().slice(0, 20000) }); // Limit to 20k chars
  } catch (error: any) {
    console.error("Parse file error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
