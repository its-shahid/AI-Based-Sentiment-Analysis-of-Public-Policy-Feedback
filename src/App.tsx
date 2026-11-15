import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Code2,
  Download,
  Gauge,
  Languages,
  Layers,
  Menu,
  RotateCcw,
  Search,
  Table2,
  Upload,
  X,
} from 'lucide-react';
import { downloadPythonProjectZip, getDefaultCsvText } from './data/projectBundle';
import { ingestAndAnalyzeCsv, ingestStructuredRows } from './nlp/engine';
import { parseUploadedFile } from './nlp/fileParsers';
import type {
  FeedbackRecord,
  IngestionMetadata,
  SentimentLabel,
} from './types/policy';
import { FileUploadPanel } from './components/FileUploadPanel';
import { OverviewTab } from './components/OverviewTab';
import { TopicsSummaryTab } from './components/TopicsSummaryTab';
import { ExplorerTab } from './components/ExplorerTab';
import { LiveAnalyzerTab } from './components/LiveAnalyzerTab';
import { EvaluationTab } from './components/EvaluationTab';
import { PythonProjectTab } from './components/PythonProjectTab';

type ActiveView = 'overview' | 'topics' | 'explorer' | 'live' | 'evaluation' | 'python';

const NAV_ITEMS: Array<{
  id: ActiveView;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'overview',
    label: 'Overview & Trends',
    subtitle: 'Executive KPI summary, temporal trends, and policy polarity comparison',
    icon: BarChart3,
  },
  {
    id: 'topics',
    label: 'Topics & Summary',
    subtitle: 'Recurring citizen concerns, suggestions, and plain-language policy verdict',
    icon: Layers,
  },
  {
    id: 'explorer',
    label: 'Feedback Explorer',
    subtitle: 'Search, sort, inspect preprocessed NLP tokens, and export filtered datasets',
    icon: Table2,
  },
  {
    id: 'live',
    label: 'Live Analyzer',
    subtitle: 'Real-time sentiment scoring for English, Hindi, and Hinglish submissions',
    icon: Languages,
  },
  {
    id: 'evaluation',
    label: 'Model Evaluation',
    subtitle: 'Confusion matrix, macro F1 benchmarks, and topic-extraction relevance',
    icon: Gauge,
  },
  {
    id: 'python',
    label: 'Python & Docs',
    subtitle: 'Downloadable Streamlit/Scikit-Learn codebase, setup guide, and project reports',
    icon: Code2,
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showUploadPanelDrawer, setShowUploadPanelDrawer] = useState<boolean>(false);

  // Baseline trained model & bundled 600-row corpus
  const defaultIngestion = useMemo(
    () => ingestAndAnalyzeCsv(getDefaultCsvText(), undefined, 'public_policy_feedback.csv'),
    []
  );

  // Active Dataset State (supports CSV, XLSX, XLS, JSON, TXT, PDF)
  const [records, setRecords] = useState<FeedbackRecord[]>(() => defaultIngestion.records);
  const [activeModel, setActiveModel] = useState(() => defaultIngestion.model);
  const [metadata, setMetadata] = useState<IngestionMetadata>(() => defaultIngestion.metadata);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isCustomDataset, setIsCustomDataset] = useState<boolean>(false);

  // Interactive Filters
  const [selectedPolicy, setSelectedPolicy] = useState<string>('All Policies');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [selectedSentiments, setSelectedSentiments] = useState<SentimentLabel[]>([
    'Positive',
    'Neutral',
    'Negative',
  ]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const policies = useMemo(
    () => ['All Policies', ...Array.from(new Set(records.map((r) => r.policy_name))).sort()],
    [records]
  );
  const languages = useMemo(
    () => ['All', ...Array.from(new Set(records.map((r) => r.language))).sort()],
    [records]
  );
  const regions = useMemo(
    () => ['All Regions', ...Array.from(new Set(records.map((r) => r.region))).sort()],
    [records]
  );

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (selectedPolicy !== 'All Policies' && r.policy_name !== selectedPolicy) return false;
      if (selectedLanguage !== 'All' && r.language !== selectedLanguage) return false;
      if (selectedRegion !== 'All Regions' && r.region !== selectedRegion) return false;
      if (!selectedSentiments.includes(r.predicted_sentiment)) return false;
      if (q && !r.feedback_text.toLowerCase().includes(q) && !r.policy_name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [records, selectedPolicy, selectedLanguage, selectedRegion, selectedSentiments, searchQuery]);

  const toggleSentiment = (s: SentimentLabel) => {
    setSelectedSentiments((prev) =>
      prev.includes(s) ? (prev.length > 1 ? prev.filter((x) => x !== s) : prev) : [...prev, s]
    );
  };

  const resetFilters = () => {
    setSelectedPolicy('All Policies');
    setSelectedLanguage('All');
    setSelectedRegion('All Regions');
    setSelectedSentiments(['Positive', 'Neutral', 'Negative']);
    setSearchQuery('');
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const parsed = await parseUploadedFile(file);
      if (parsed.error) {
        setUploadError(parsed.error);
        return;
      }

      const analyzed = ingestStructuredRows(
        parsed.rows,
        { fileName: parsed.fileName, fileType: parsed.fileType },
        defaultIngestion.model
      );

      if (analyzed.error) {
        setUploadError(analyzed.error);
        return;
      }

      setRecords(analyzed.records);
      setActiveModel(analyzed.model);
      setMetadata(analyzed.metadata);
      setIsCustomDataset(true);

      const skippedNote =
        analyzed.metadata.droppedEmptyCount > 0
          ? ` (${analyzed.metadata.droppedEmptyCount} empty row${
              analyzed.metadata.droppedEmptyCount > 1 ? 's' : ''
            } skipped)`
          : '';

      setUploadSuccess(
        `Loaded ${analyzed.records.length.toLocaleString()} valid feedback comments out of ${analyzed.metadata.rawRowCount.toLocaleString()} extracted entries from "${file.name}" (${parsed.fileType})${skippedNote}.`
      );
      resetFilters();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to parse uploaded file.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const restoreDefaultDataset = () => {
    setRecords(defaultIngestion.records);
    setActiveModel(defaultIngestion.model);
    setMetadata(defaultIngestion.metadata);
    setIsCustomDataset(false);
    setUploadError(null);
    setUploadSuccess(null);
    resetFilters();
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === activeView) ?? NAV_ITEMS[0];
  const isOverview = activeView === 'overview';

  return (
    <div className="min-h-screen flex bg-[#F4F7FC] text-[#0B1F3A]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#0B1F3A]/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Navy Blue Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#0B1F3A] text-white flex flex-col transition-transform duration-200 lg:translate-x-0 shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-5 border-b border-[#163A70] flex items-center justify-between">
          <div>
            <div className="font-display text-[22px] font-bold tracking-tight text-white leading-none">
              CivicPulse
            </div>
            <div className="text-[13px] text-[#93C5FD] mt-1 font-medium">
              Public Policy Sentiment AI
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 border-b border-[#163A70]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[15px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-[#CBD5E1] hover:bg-[#163A70] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Interactive Dataset Filters */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-[15px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Dataset Filters</span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-[14px] text-[#93C5FD] hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <div>
            <label htmlFor="search-filter" className="block text-[#CBD5E1] font-medium mb-1.5 text-[14px]">
              Keyword Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#93C5FD] absolute left-3 top-3" />
              <input
                id="search-filter"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="subsidy, देरी, portal..."
                className="w-full pl-9 pr-3 py-2 bg-[#163A70] border border-[#295496] rounded-lg text-[15px] text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="policy-filter" className="block text-[#CBD5E1] font-medium mb-1.5 text-[14px]">
              Public Policy Scheme
            </label>
            <select
              id="policy-filter"
              value={selectedPolicy}
              onChange={(e) => setSelectedPolicy(e.target.value)}
              className="w-full px-3 py-2 bg-[#163A70] border border-[#295496] rounded-lg text-[15px] text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {policies.map((p) => (
                <option key={p} value={p} className="bg-[#0B1F3A] text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language-filter" className="block text-[#CBD5E1] font-medium mb-1.5 text-[14px]">
              Language
            </label>
            <select
              id="language-filter"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-[#163A70] border border-[#295496] rounded-lg text-[15px] text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {languages.map((l) => (
                <option key={l} value={l} className="bg-[#0B1F3A] text-white">
                  {l === 'All' ? 'All Languages' : l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="region-filter" className="block text-[#CBD5E1] font-medium mb-1.5 text-[14px]">
              Region / State
            </label>
            <select
              id="region-filter"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 bg-[#163A70] border border-[#295496] rounded-lg text-[15px] text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {regions.map((r) => (
                <option key={r} value={r} className="bg-[#0B1F3A] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[#CBD5E1] font-medium mb-2 text-[14px]">
              Sentiment Classes
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#163A70] rounded-lg">
              {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((s) => {
                const active = selectedSentiments.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSentiment(s)}
                    className={`py-1.5 px-2 rounded-md text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#163A70] space-y-1.5 text-[14px] text-[#CBD5E1]">
            <div className="truncate font-mono text-white" title={metadata.fileName}>
              Source: {metadata.fileName}
            </div>
            <div className="font-mono tabular-nums">
              Loaded: {records.length.toLocaleString()} / {metadata.rawRowCount.toLocaleString()} rows
            </div>
            <div className="font-mono tabular-nums text-[#93C5FD]">
              Active: {filteredRecords.length.toLocaleString()} / {records.length.toLocaleString()} rows
            </div>
            {metadata.droppedEmptyCount > 0 && (
              <div className="font-mono tabular-nums text-[#FCD34D]">
                Skipped empty: {metadata.droppedEmptyCount}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean White Header */}
        <header className="bg-white border-b border-[#DCE5F2] px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#0B1F3A] hover:bg-[#F4F7FC] border border-[#DCE5F2] rounded-lg cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[26px] md:text-[28px] font-bold tracking-tight text-[#0B1F3A] leading-tight truncate">
                {activeNav.label}
              </h1>
              <p className="text-[14px] md:text-[15px] text-[#475569] truncate mt-0.5">
                {activeNav.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isOverview && (
              <button
                type="button"
                onClick={() => setShowUploadPanelDrawer((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-[14px] font-semibold text-[#163A70] bg-[#F4F7FC] hover:bg-[#E0EAFF] border border-[#CBD8EC] rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                {showUploadPanelDrawer ? 'Hide Uploader' : 'Upload Dataset'}
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadPythonProjectZip()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Python ZIP
            </button>
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="p-6 max-w-7xl w-full mx-auto flex-1 space-y-6">
          {(isOverview || showUploadPanelDrawer) && (
            <FileUploadPanel
              metadata={metadata}
              isLoading={isUploading}
              uploadError={uploadError}
              uploadSuccess={uploadSuccess}
              isCustomDataset={isCustomDataset}
              onFileSelected={handleFileUpload}
              onRestoreDefault={restoreDefaultDataset}
              onDismissNotice={() => setUploadSuccess(null)}
              onDismissError={() => setUploadError(null)}
            />
          )}

          {activeView === 'overview' && (
            <OverviewTab records={filteredRecords} totalLoaded={records.length} />
          )}
          {activeView === 'topics' && (
            <TopicsSummaryTab records={filteredRecords} selectedPolicy={selectedPolicy} />
          )}
          {activeView === 'explorer' && <ExplorerTab records={filteredRecords} />}
          {activeView === 'live' && <LiveAnalyzerTab model={activeModel} />}
          {activeView === 'evaluation' && (
            <EvaluationTab
              records={records}
              hasGroundTruth={metadata.hasGroundTruth}
              fallbackRecords={defaultIngestion.records}
            />
          )}
          {activeView === 'python' && <PythonProjectTab />}
        </main>
      </div>
    </div>
  );
}
