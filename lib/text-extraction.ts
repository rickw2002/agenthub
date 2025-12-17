export async function extractTextFromFile(
  _fileBuffer: Buffer,
  _fileName: string
): Promise<string> {
  // Documentverwerking is uitgeschakeld; deze functie wordt niet meer gebruikt.
  throw new Error("Document text extraction is disabled in this environment.");
}

