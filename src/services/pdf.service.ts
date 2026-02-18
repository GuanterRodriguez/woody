import {
  readFile,
  writeFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import { WoodyError } from "@/types/errors";

const DOCUMENTS_DIR = "documents";

export function extractFileName(filePath: string): string {
  const segments = filePath.split(/[\\/]/);
  return segments[segments.length - 1] ?? "document.pdf";
}

export async function ensureDocumentsDir(): Promise<string> {
  try {
    const appDir = await appDataDir();
    const docsDir = await join(appDir, DOCUMENTS_DIR);
    const dirExists = await exists(docsDir);
    if (!dirExists) {
      await mkdir(docsDir, { recursive: true });
    }
    return docsDir;
  } catch (error) {
    throw new WoodyError(
      "Impossible de creer le dossier documents",
      "FS_MKDIR_FAILED",
      error,
    );
  }
}

export async function readPdfBytes(
  filePath: string,
): Promise<Uint8Array> {
  try {
    return await readFile(filePath);
  } catch (error) {
    throw new WoodyError(
      "Impossible de lire le fichier PDF",
      "PDF_READ_FAILED",
      error,
    );
  }
}

export async function validatePdf(filePath: string): Promise<boolean> {
  try {
    const bytes = await readFile(filePath);
    await PDFDocument.load(bytes, { ignoreEncryption: true });
    return true;
  } catch {
    return false;
  }
}

export async function getPdfPageCount(
  filePath: string,
): Promise<number> {
  try {
    const bytes = await readFile(filePath);
    const pdfDoc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
    });
    return pdfDoc.getPageCount();
  } catch (error) {
    throw new WoodyError(
      "Impossible de lire le nombre de pages du PDF",
      "PDF_READ_FAILED",
      error,
    );
  }
}

export async function copyPdfToAppDir(
  originalPath: string,
  fileName: string,
): Promise<string> {
  try {
    const docsDir = await ensureDocumentsDir();
    const uniqueName = `${uuidv4().slice(0, 8)}_${fileName}`;
    const destPath = await join(docsDir, uniqueName);
    const bytes = await readFile(originalPath);
    await writeFile(destPath, bytes);
    return destPath;
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de copier le fichier PDF",
      "PDF_COPY_FAILED",
      error,
    );
  }
}

export async function splitPdf(
  sourcePath: string,
  pageNumbers: number[],
  outputFileName: string,
): Promise<string> {
  try {
    const docsDir = await ensureDocumentsDir();
    const sourceBytes = await readFile(sourcePath);
    const sourceDoc = await PDFDocument.load(sourceBytes, {
      ignoreEncryption: true,
    });
    const newDoc = await PDFDocument.create();

    for (const pageNum of pageNumbers) {
      const [copiedPage] = await newDoc.copyPages(sourceDoc, [
        pageNum - 1,
      ]);
      if (copiedPage) {
        newDoc.addPage(copiedPage);
      }
    }

    const newBytes = await newDoc.save();
    const destPath = await join(docsDir, outputFileName);
    await writeFile(destPath, newBytes);
    return destPath;
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de decouper le PDF",
      "PDF_SPLIT_FAILED",
      error,
    );
  }
}

export interface SplitSegment {
  fileName: string;
  filePath: string;
  pageCount: number;
}

export async function splitPdfBySegments(
  sourcePath: string,
  splitPoints: number[],
  totalPages: number,
): Promise<SplitSegment[]> {
  try {
    const docsDir = await ensureDocumentsDir();
    const sourceBytes = await readFile(sourcePath);
    const sourceDoc = await PDFDocument.load(sourceBytes, {
      ignoreEncryption: true,
    });

    // Extract source file name without extension
    const sourceFileName = extractFileName(sourcePath);
    const sourceBaseName = sourceFileName.replace(/\.pdf$/i, "");

    const sorted = [...splitPoints].sort((a, b) => a - b);
    const boundaries = [0, ...sorted, totalPages];
    const segments: SplitSegment[] = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const startPage = (boundaries[i] ?? 0) + 1;
      const endPage = boundaries[i + 1] ?? totalPages;
      if (startPage > endPage) continue;

      const newDoc = await PDFDocument.create();
      const indices = Array.from(
        { length: endPage - startPage + 1 },
        (_, k) => startPage - 1 + k,
      );
      const copiedPages = await newDoc.copyPages(sourceDoc, indices);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }

      // Generate file name with page range: "1-document.pdf" or "1-3-document.pdf"
      const pageRange =
        startPage === endPage
          ? String(startPage)
          : `${String(startPage)}-${String(endPage)}`;
      const fileName = `${pageRange}-${sourceBaseName}.pdf`;

      const newBytes = await newDoc.save();
      const destPath = await join(docsDir, fileName);
      await writeFile(destPath, newBytes);

      segments.push({
        fileName,
        filePath: destPath,
        pageCount: endPage - startPage + 1,
      });
    }

    return segments;
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de decouper le PDF",
      "PDF_SPLIT_FAILED",
      error,
    );
  }
}

export function formatPageRanges(pages: number[]): string {
  if (pages.length === 0) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  if (start === undefined) return "";
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === undefined) continue;
    if (current === end + 1) {
      end = current;
    } else {
      ranges.push(
        start === end
          ? String(start)
          : String(start) + "-" + String(end),
      );
      start = current;
      end = start;
    }
  }
  ranges.push(
    start === end
      ? String(start)
      : String(start) + "-" + String(end),
  );
  return ranges.join(", ");
}
