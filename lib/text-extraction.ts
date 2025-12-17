// Use CommonJS-style requires and normalize default/namespace exports
// to avoid ESM interop issues in different environments.
const pdfParseModule = require("pdf-parse") as {
  default?: (buffer: Buffer) => Promise<{ text: string }>;
} | ((buffer: Buffer) => Promise<{ text: string }>);

const pdfParse: (buffer: Buffer) => Promise<{ text: string }> =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : (pdfParseModule as { default: (buffer: Buffer) => Promise<{ text: string }> }).default;

const mammothModule = require("mammoth") as typeof import("mammoth") & {
  default?: typeof import("mammoth");
};

const mammoth = (mammothModule.default ?? mammothModule) as typeof import("mammoth");

export async function extractTextFromFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    case "pdf":
      return await extractTextFromPDF(fileBuffer);

    case "docx":
    case "doc":
      return await extractTextFromDOCX(fileBuffer);

    case "txt":
    case "md":
      return extractTextFromText(fileBuffer);

    default:
      // Try to extract as text for unknown formats
      return extractTextFromText(fileBuffer);
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text || "";

    // Basic debug logging for PDF extraction
    const length = text.length;
    const preview = text.slice(0, 300).replace(/\s+/g, " ").trim();
    console.log("[TEXT-EXTRACTION][PDF]", {
      length,
      preview,
    });

    // If the extracted text is very short, treat it as \"no readable text\"
    if (length < 500) {
      // Special signal for callers: document likely needs OCR
      throw new Error("NO_READABLE_TEXT");
    }

    return text;
  } catch (error) {
    // Preserve NO_READABLE_TEXT as a dedicated, detectable signal
    if (error instanceof Error && error.message === "NO_READABLE_TEXT") {
      throw error;
    }

    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function extractTextFromText(buffer: Buffer): string {
  try {
    return buffer.toString("utf-8");
  } catch (error) {
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

