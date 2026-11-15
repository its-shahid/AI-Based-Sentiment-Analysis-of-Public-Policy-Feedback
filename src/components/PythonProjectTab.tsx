import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, FileText, FolderOpen, Terminal } from 'lucide-react';
import { downloadPythonProjectZip, getMarkdownDoc, PROJECT_FILES } from '../data/projectBundle';

type DocSubView = 'code' | 'project_report' | 'eval_report' | 'setup';

export const PythonProjectTab: React.FC = () => {
  const [subView, setSubView] = useState<DocSubView>('code');
  const [selectedPath, setSelectedPath] = useState<string>('app.py');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  const activeFile = PROJECT_FILES.find((f) => f.path === selectedPath) ?? PROJECT_FILES[0];

  const folders = Array.from(new Set(PROJECT_FILES.map((f) => f.folder)));

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(label);
      setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      // Ignore clipboard permission errors in sandboxed iframes
    }
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadPythonProjectZip();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Sub-View Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubView('code')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subView === 'code'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Source Code Explorer ({PROJECT_FILES.length} files)
          </button>
          <button
            type="button"
            onClick={() => setSubView('setup')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subView === 'setup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Windows VS Code Setup
          </button>
          <button
            type="button"
            onClick={() => setSubView('project_report')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subView === 'project_report'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Project Report
          </button>
          <button
            type="button"
            onClick={() => setSubView('eval_report')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subView === 'eval_report'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evaluation Report
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Packaging ZIP...' : 'Download Complete Python Project (.zip)'}
        </button>
      </div>

      {subView === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 max-h-[640px] overflow-y-auto">
            <div className="text-xs font-semibold text-slate-700 pb-2.5 border-b border-slate-100">
              public_policy_sentiment_ai/
            </div>
            <div className="mt-3 space-y-4">
              {folders.map((folder) => {
                const files = PROJECT_FILES.filter((f) => f.folder === folder);
                return (
                  <div key={folder}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{folder === 'root' ? 'Project Root' : `${folder}/`}</span>
                    </div>
                    <div className="space-y-0.5 pl-2">
                      {files.map((file) => {
                        const isActive = file.path === activeFile?.path;
                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => setSelectedPath(file.path)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {file.extension === 'py' ? (
                              <FileCode2 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate">{file.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Content Viewer */}
          {activeFile && (
            <div className="lg:col-span-8 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg overflow-hidden flex flex-col max-h-[640px]">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="text-xs font-mono text-slate-200 truncate">
                  public_policy_sentiment_ai/{activeFile.path}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(activeFile.content, activeFile.path)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer shrink-0"
                >
                  {copiedPath === activeFile.path ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy File
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono leading-relaxed overflow-auto flex-1 text-slate-200">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {subView === 'setup' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Terminal className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Windows 10/11 + VS Code Execution Guide (16GB RAM)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download the project ZIP above, extract it, open the folder in VS Code, and run these commands in the PowerShell terminal (`Ctrl + ~`).
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {[
              {
                step: '1. Create & Activate Python Virtual Environment',
                cmd: 'python -m venv .venv\n.\\.venv\\Scripts\\Activate.ps1',
              },
              {
                step: '2. Install Dependencies (Lightweight CPU-Only Packages)',
                cmd: 'python -m pip install --upgrade pip\npip install -r requirements.txt',
              },
              {
                step: '3. Generate Dataset, Train Models & Save Evaluation Metrics',
                cmd: 'python data\\generate_dataset.py\npython run_pipeline.py',
              },
              {
                step: '4. Run Automated Unit & Integration Tests',
                cmd: 'python -m unittest discover -s tests -v',
              },
              {
                step: '5. Launch Interactive Streamlit Dashboard',
                cmd: 'streamlit run app.py',
              },
            ].map((block) => (
              <div key={block.step} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{block.step}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(block.cmd, block.step)}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {copiedPath === block.step ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 text-slate-100 font-mono overflow-x-auto">
                  {block.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {subView === 'project_report' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              docs/PROJECT_REPORT.md
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(getMarkdownDoc('docs/PROJECT_REPORT.md'), 'project_report')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              {copiedPath === 'project_report' ? 'Copied' : 'Copy Markdown'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
            {getMarkdownDoc('docs/PROJECT_REPORT.md')}
          </pre>
        </div>
      )}

      {subView === 'eval_report' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              docs/EVALUATION_REPORT.md
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(getMarkdownDoc('docs/EVALUATION_REPORT.md'), 'eval_report')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              {copiedPath === 'eval_report' ? 'Copied' : 'Copy Markdown'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
            {getMarkdownDoc('docs/EVALUATION_REPORT.md')}
          </pre>
        </div>
      )}
    </div>
  );
};
