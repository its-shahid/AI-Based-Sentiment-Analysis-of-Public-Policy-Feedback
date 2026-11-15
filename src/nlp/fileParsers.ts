import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { SupportedFileType } from '../types/policy';

export interface ParsedRawDataset {
  rows: Array<Record<string, string>>;
  fileName: string;
  fileType: SupportedFileType;
  extractedCount: number;
  error?: string;
}

// RFC-4180 CSV parser handling quoted commas, newlines inside quotes, and UTF-8 BOM
export function parseCsvToRowObjects(csvText: string): Array<Record<string, string>> {
  const clean = csvText.replace(/^\uFEFF/, '');
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field);
        matrix.push(row);
        row = [];
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        matrix.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    matrix.push(row);
  }

  const nonEmpty = matrix.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  const objects: Array<Record<string, string>> = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = nonEmpty[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = (cells[idx] ?? '').trim();
    });
    objects.push(obj);
  }
  return objects;
}

function extractCommentsFromPlainText(rawText: string): Array<Record<string, string>> {
  const lines = rawText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((ln) => ln.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim());

  const comments: string[] = [];
  let buffer: string[] = [];

  for (const ln of lines) {
    if (!ln || /^(?:page\s*)?\d+(?:\s*of\s*\d+)?$/i.test(ln)) {
      if (buffer.length > 0) {
        comments.push(buffer.join(' ').trim());
        buffer = [];
      }
      continue;
    }

    const wordCount = ln.split(/\s+/).length;
    if (wordCount >= 4 || /[.!?।]$/.test(ln)) {
      if (buffer.length > 0) {
        comments.push(buffer.join(' ').trim());
        buffer = [];
      }
      comments.push(ln);
    } else {
      buffer.push(ln);
    }
  }

  if (buffer.length > 0) {
    comments.push(buffer.join(' ').trim());
  }

  return comments
    .filter((c) => c.length >= 4)
    .map((comment) => ({ feedback_text: comment }));
}

function parseJsonRows(rawText: string): Array<Record<string, string>> {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try NDJSON (newline-delimited JSON objects)
    const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const items: unknown[] = [];
    for (const ln of lines) {
      items.push(JSON.parse(ln));
    }
    parsed = items;
  }

  let list: unknown[] = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const wrapperKey = ['data', 'records', 'feedback', 'comments', 'items', 'rows'].find((k) =>
      Array.isArray(record[k])
    );
    list = wrapperKey ? (record[wrapperKey] as unknown[]) : [record];
  }

  return list
    .map((item) => {
      if (typeof item === 'string') {
        return { feedback_text: item.trim() };
      }
      if (item && typeof item === 'object') {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          if (v !== null && v !== undefined) {
            flat[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
          }
        }
        return flat;
      }
      return null;
    })
    .filter((r): r is Record<string, string> => r !== null && Object.keys(r).length > 0);
}

async function parsePdfFile(buffer: ArrayBuffer): Promise<string> {
  if (typeof pdfjsWorker === 'string' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine: string[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform?: number[] };
      const y = textItem.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
          currentLine = [];
        }
      }
      if (textItem.str.trim()) {
        currentLine.push(textItem.str);
      }
      lastY = y;
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
    }
    pageTexts.push(lines.join('\n'));
  }

  return pageTexts.join('\n');
}

export async function parseUploadedFile(file: File): Promise<ParsedRawDataset> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  try {
    if (ext === 'csv') {
      const text = await file.text();
      const rows = parseCsvToRowObjects(text);
      if (rows.length === 0) {
        return { rows: [], fileName, fileType: 'CSV', extractedCount: 0, error: 'CSV file is empty or missing data rows.' };
      }
      return { rows, fileName, fileType: 'CSV', extractedCount: rows.length };
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      let rows: Array<Record<string, string>> = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        if (jsonRows.length > 0) {
          rows = jsonRows.map((r) => {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(r)) {
              out[k] = v === null || v === undefined ? '' : String(v).trim();
            }
            return out;
          });
          break;
        }
      }
      if (rows.length === 0) {
        return { rows: [], fileName, fileType: 'Excel', extractedCount: 0, error: 'No tabular rows found in the Excel workbook.' };
      }
      return { rows, fileName, fileType: 'Excel', extractedCount: rows.length };
    }

    if (ext === 'json') {
      const text = await file.text();
      const rows = parseJsonRows(text);
      if (rows.length === 0) {
        return { rows: [], fileName, fileType: 'JSON', extractedCount: 0, error: 'JSON file contains zero feedback records.' };
      }
      return { rows, fileName, fileType: 'JSON', extractedCount: rows.length };
    }

    if (ext === 'txt') {
      const text = await file.text();
      const rows = extractCommentsFromPlainText(text);
      if (rows.length === 0) {
        return { rows: [], fileName, fileType: 'TXT', extractedCount: 0, error: 'No readable comments found in TXT file.' };
      }
      return { rows, fileName, fileType: 'TXT', extractedCount: rows.length };
    }

    if (ext === 'pdf') {
      const buffer = await file.arrayBuffer();
      const extractedText = await parsePdfFile(buffer);
      if (!extractedText.trim()) {
        return {
          rows: [],
          fileName,
          fileType: 'PDF',
          extractedCount: 0,
          error: 'Could not extract readable text from this PDF (it may contain scanned images).',
        };
      }
      const rows = extractCommentsFromPlainText(extractedText);
      if (rows.length === 0) {
        return { rows: [], fileName, fileType: 'PDF', extractedCount: 0, error: 'No valid feedback comments found in PDF pages.' };
      }
      return { rows, fileName, fileType: 'PDF', extractedCount: rows.length };
    }

    return {
      rows: [],
      fileName,
      fileType: 'CSV',
      extractedCount: 0,
      error: `Unsupported file extension ".${ext}". Please upload .csv, .xlsx, .xls, .json, .txt, or .pdf.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected parsing error.';
    return {
      rows: [],
      fileName,
      fileType: ext === 'pdf' ? 'PDF' : ext === 'json' ? 'JSON' : ext === 'txt' ? 'TXT' : ext === 'xlsx' || ext === 'xls' ? 'Excel' : 'CSV',
      extractedCount: 0,
      error: `Failed to parse "${fileName}": ${message}`,
    };
  }
}
