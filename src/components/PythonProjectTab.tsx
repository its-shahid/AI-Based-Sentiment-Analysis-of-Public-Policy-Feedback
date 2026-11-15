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
    <div className="space-y-6">
      {/* Top Action & Sub-View Switcher */}
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F4F7FC] border border-[#DCE5F2] rounded-xl">
          {[
            { id: 'code' as const, label: `Source Code (${PROJECT_FILES.length} files)` },
            { id: 'setup' as const, label: 'Windows VS Code Setup' },
            { id: 'project_report' as const, label: 'Project Report' },
            { id: 'eval_report' as const, label: 'Evaluation Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`px-3.5 py-2 text-[14px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                subView === tab.id
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-[#334155] hover:text-[#0B1F3A] hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[15px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Packaging ZIP...' : 'Download Python Project (.zip)'}
        </button>
      </div>

      {subView === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-4 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-5 max-h-[660px] overflow-y-auto">
            <div className="text-[15px] font-semibold text-[#0B1F3A] pb-3 border-b border-[#E2E8F0]">
              public_policy_sentiment_ai/
            </div>
            <div className="mt-4 space-y-4">
              {folders.map((folder) => {
                const files = PROJECT_FILES.filter((f) => f.folder === folder);
                return (
                  <div key={folder}>
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-[#163A70] mb-1.5">
                      <FolderOpen className="w-4 h-4 text-[#2563EB]" />
                      <span>{folder === 'root' ? 'Project Root' : `${folder}/`}</span>
                    </div>
                    <div className="space-y-1 pl-2">
                      {files.map((file) => {
                        const isActive = file.path === activeFile?.path;
                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => setSelectedPath(file.path)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[14px] font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                                : 'text-[#334155] hover:bg-[#F4F7FC]'
                            }`}
                          >
                            {file.extension === 'py' ? (
                              <FileCode2 className="w-4 h-4 shrink-0 text-[#2563EB]" />
                            ) : (
                              <FileText className="w-4 h-4 shrink-0 text-[#64748B]" />
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
            <div className="lg:col-span-8 bg-[#0B1F3A] text-slate-100 border border-[#163A70] rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[660px]">
              <div className="px-5 py-3.5 bg-[#163A70] border-b border-[#234C8A] flex items-center justify-between gap-4">
                <div className="text-[14px] font-mono text-white truncate">
                  public_policy_sentiment_ai/{activeFile.path}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(activeFile.content, activeFile.path)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-[#0B1F3A] hover:bg-[#2563EB] rounded-lg cursor-pointer shrink-0 transition-colors"
                >
                  {copiedPath === activeFile.path ? (
                    <>
                      <Check className="w-4 h-4 text-[#4ADE80]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy File
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 text-[14px] font-mono leading-relaxed overflow-auto flex-1 text-slate-100">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {subView === 'setup' && (
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-3.5">
            <Terminal className="w-6 h-6 text-[#2563EB] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
                Windows 10/11 + VS Code Execution Guide (16GB RAM)
              </h2>
              <p className="text-[15px] text-[#475569] mt-1">
                Download the project ZIP, extract it, open the folder in VS Code, and execute these commands in PowerShell (`Ctrl + ~`). Supports CSV, Excel (.xlsx/.xls), JSON, TXT, and PDF uploads.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[14px]">
            {[
              {
                step: '1. Create & Activate Python Virtual Environment',
                cmd: 'python -m venv .venv\n.\\.venv\\Scripts\\Activate.ps1',
              },
              {
                step: '2. Install Dependencies (NLP, Scikit-Learn, Streamlit, Plotly, Excel & PDF Parsers)',
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
              <div key={block.step} className="border border-[#DCE5F2] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F4F7FC] border-b border-[#DCE5F2] flex items-center justify-between">
                  <span className="font-semibold text-[15px] text-[#0B1F3A]">{block.step}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(block.cmd, block.step)}
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#163A70] hover:text-[#2563EB] cursor-pointer"
                  >
                    {copiedPath === block.step ? (
                      <>
                        <Check className="w-4 h-4 text-[#16A34A]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-[#0B1F3A] text-slate-100 font-mono text-[14px] overflow-x-auto">
                  {block.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {subView === 'project_report' && (
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-5">
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              docs/PROJECT_REPORT.md
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(getMarkdownDoc('docs/PROJECT_REPORT.md'), 'project_report')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#163A70] bg-[#F4F7FC] border border-[#CBD8EC] rounded-lg hover:bg-[#EFF6FF] cursor-pointer"
            >
              {copiedPath === 'project_report' ? 'Copied' : 'Copy Markdown'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[15px] text-[#1E293B] leading-relaxed">
            {getMarkdownDoc('docs/PROJECT_REPORT.md')}
          </pre>
        </div>
      )}

      {subView === 'eval_report' && (
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-5">
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              docs/EVALUATION_REPORT.md
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(getMarkdownDoc('docs/EVALUATION_REPORT.md'), 'eval_report')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#163A70] bg-[#F4F7FC] border border-[#CBD8EC] rounded-lg hover:bg-[#EFF6FF] cursor-pointer"
            >
              {copiedPath === 'eval_report' ? 'Copied' : 'Copy Markdown'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[15px] text-[#1E293B] leading-relaxed">
            {getMarkdownDoc('docs/EVALUATION_REPORT.md')}
          </pre>
        </div>
      )}
    </div>
  );
};
