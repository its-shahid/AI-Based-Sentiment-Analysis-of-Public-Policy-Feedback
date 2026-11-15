import React, { useMemo, useRef, useState } from 'react';
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
import { ingestAndAnalyzeCsv } from './nlp/engine';
import type { SentimentLabel } from './types/policy';
import { OverviewTab } from './components/OverviewTab';
import { TopicsSummaryTab } from './components/TopicsSummaryTab';
import { ExplorerTab } from './components/ExplorerTab';
import { LiveAnalyzerTab } from './components/LiveAnalyzerTab';
import { EvaluationTab } from './components/EvaluationTab';
import { PythonProjectTab } from './components/PythonProjectTab';

type ActiveView = 'overview' | 'topics' | 'explorer' | 'live' | 'evaluation' | 'python';

const NAV_ITEMS: Array<{ id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview & Trends', icon: BarChart3 },
  { id: 'topics', label: 'Topics & Summary', icon: Layers },
  { id: 'explorer', label: 'Feedback Explorer', icon: Table2 },
  { id: 'live', label: 'Live Analyzer', icon: Languages },
  { id: 'evaluation', label: 'Model Evaluation', icon: Gauge },
  { id: 'python', label: 'Python & Docs', icon: Code2 },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Dataset State
  const [datasetName, setDatasetName] = useState<string>('public_policy_feedback.csv');
  const [csvText, setCsvText] = useState<string>(() => getDefaultCsvText());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultIngestion = useMemo(() => ingestAndAnalyzeCsv(getDefaultCsvText()), []);

  const {
    records,
    model,
    rawRowCount,
    droppedEmptyCount,
    hasGroundTruth,
    error: parseError,
  } = useMemo(
    () => ingestAndAnalyzeCsv(csvText, defaultIngestion.model),
    [csvText, defaultIngestion.model]
  );

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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      const check = ingestAndAnalyzeCsv(content, defaultIngestion.model);
      if (check.error) {
        setUploadError(check.error);
        setUploadNotice(null);
      } else {
        setUploadError(null);
        setCsvText(content);
        setDatasetName(file.name);
        const skippedNote =
          check.droppedEmptyCount > 0
            ? ` (${check.droppedEmptyCount} blank row${check.droppedEmptyCount > 1 ? 's' : ''} skipped)`
            : '';
        setUploadNotice(
          `Loaded ${check.records.length.toLocaleString()} of ${check.rawRowCount.toLocaleString()} feedback records from "${file.name}"${skippedNote}.`
        );
        resetFilters();
      }
    };
    reader.onerror = () => {
      setUploadError('Unable to read the selected CSV file.');
      setUploadNotice(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const resetToDefaultDataset = () => {
    setCsvText(getDefaultCsvText());
    setDatasetName('public_policy_feedback.csv');
    setUploadError(null);
    setUploadNotice(null);
    resetFilters();
  };

  const currentTabTitle = NAV_ITEMS.find((n) => n.id === activeView)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (264px) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CivicPulse
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 border-b border-slate-200">
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Interactive Dataset Filters */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Dataset Filters</span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div>
            <label htmlFor="search-filter" className="block text-slate-600 font-medium mb-1">
              Keyword Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="search-filter"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="subsidy, देरी, portal..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="policy-filter" className="block text-slate-600 font-medium mb-1">
              Public Policy Scheme
            </label>
            <select
              id="policy-filter"
              value={selectedPolicy}
              onChange={(e) => setSelectedPolicy(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {policies.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language-filter" className="block text-slate-600 font-medium mb-1">
              Language
            </label>
            <select
              id="language-filter"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l === 'All' ? 'All Languages' : l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="region-filter" className="block text-slate-600 font-medium mb-1">
              Region / State
            </label>
            <select
              id="region-filter"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-slate-600 font-medium mb-1.5">Sentiment Classes</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
              {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((s) => {
                const active = selectedSentiments.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSentiment(s)}
                    className={`py-1 px-1.5 rounded-sm text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-500">
            <div className="truncate font-mono" title={datasetName}>
              Source: {datasetName}
            </div>
            <div className="font-mono tabular-nums">
              Loaded: {records.length.toLocaleString()} / {rawRowCount.toLocaleString()} rows
            </div>
            <div className="font-mono tabular-nums">
              Active: {filteredRecords.length.toLocaleString()} / {records.length.toLocaleString()} rows
            </div>
            {droppedEmptyCount > 0 && (
              <div className="font-mono tabular-nums text-amber-700">
                Skipped empty: {droppedEmptyCount}
              </div>
            )}
            {datasetName !== 'public_policy_feedback.csv' && (
              <button
                type="button"
                onClick={resetToDefaultDataset}
                className="text-blue-700 hover:underline font-medium cursor-pointer"
              >
                Restore bundled 600-row CSV
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span>Public Policy Sentiment AI</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="font-semibold text-slate-900">{currentTabTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </button>
            <button
              type="button"
              onClick={() => downloadPythonProjectZip()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Python ZIP
            </button>
          </div>
        </header>

        {/* Validation Confirmation / Error Banners */}
        {uploadNotice && !uploadError && !parseError && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center justify-between gap-4">
            <span className="font-medium">{uploadNotice}</span>
            <button
              type="button"
              onClick={() => setUploadNotice(null)}
              className="font-semibold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {(uploadError || parseError) && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center justify-between">
            <span>CSV Error: {uploadError || parseError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active View Viewport */}
        <main className="p-6 max-w-7xl w-full mx-auto flex-1">
          {activeView === 'overview' && (
            <OverviewTab records={filteredRecords} totalLoaded={records.length} />
          )}
          {activeView === 'topics' && (
            <TopicsSummaryTab records={filteredRecords} selectedPolicy={selectedPolicy} />
          )}
          {activeView === 'explorer' && <ExplorerTab records={filteredRecords} />}
          {activeView === 'live' && <LiveAnalyzerTab model={model} />}
          {activeView === 'evaluation' && (
            <EvaluationTab
              records={records}
              hasGroundTruth={hasGroundTruth}
              fallbackRecords={defaultIngestion.records}
            />
          )}
          {activeView === 'python' && <PythonProjectTab />}
        </main>
      </div>
    </div>
  );
}
