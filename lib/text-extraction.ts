// Use CommonJS-style requires and normalize default/namespace exports
// to avoid ESM interop issues in different environments.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseModule = require("pdf-parse") as {
  default?: (buffer: Buffer) => Promise<{ text: string }>;
} | ((buffer: Buffer) => Promise<{ text: string }>);

const pdfParse: (buffer: Buffer) => Promise<{ text: string }> =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : (pdfParseModule as { default: (buffer: Buffer) => Promise<{ text: string }> }).default;

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
    return data.text || "";
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
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

