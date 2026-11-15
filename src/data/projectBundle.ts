import JSZip from 'jszip';
import type { ProjectFileEntry } from '../types/policy';

// Load all real files from /public_policy_sentiment_ai directly via Vite glob
const RAW_FILES = import.meta.glob(
  [
    '/public_policy_sentiment_ai/*.{py,txt,md}',
    '/public_policy_sentiment_ai/.gitignore',
    '/public_policy_sentiment_ai/data/*.{py,csv}',
    '/public_policy_sentiment_ai/src/*.py',
    '/public_policy_sentiment_ai/docs/*.md',
    '/public_policy_sentiment_ai/tests/*.py',
    '/public_policy_sentiment_ai/models/.gitkeep',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

export const PROJECT_FILES: ProjectFileEntry[] = Object.entries(RAW_FILES)
  .map(([fullPath, content]) => {
    const cleanPath = fullPath.replace(/^\/public_policy_sentiment_ai\//, '');
    const parts = cleanPath.split('/');
    const name = parts[parts.length - 1];
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    const extParts = name.split('.');
    const extension = extParts.length > 1 ? extParts[extParts.length - 1] : 'txt';
    return {
      path: cleanPath,
      name,
      folder,
      content,
      extension,
    };
  })
  .sort((a, b) => {
    if (a.folder === 'root' && b.folder !== 'root') return -1;
    if (a.folder !== 'root' && b.folder === 'root') return 1;
    return a.path.localeCompare(b.path);
  });

export function getDefaultCsvText(): string {
  const csvEntry = PROJECT_FILES.find((f) => f.path === 'data/public_policy_feedback.csv');
  return csvEntry ? csvEntry.content : '';
}

export function getMarkdownDoc(path: string): string {
  const doc = PROJECT_FILES.find((f) => f.path === path);
  return doc ? doc.content : '';
}

export async function downloadPythonProjectZip(): Promise<void> {
  const zip = new JSZip();
  const rootFolder = zip.folder('public_policy_sentiment_ai');
  if (!rootFolder) return;

  for (const file of PROJECT_FILES) {
    rootFolder.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'public_policy_sentiment_ai.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
