import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Download } from 'lucide-react';
import type { FeedbackRecord, SentimentLabel } from '../types/policy';

interface ExplorerTabProps {
  records: FeedbackRecord[];
}

type SortKey = 'submitted_date' | 'policy_name' | 'language' | 'predicted_sentiment' | 'confidence';

const SENTIMENT_TEXT_COLOR: Record<SentimentLabel, string> = {
  Positive: 'text-emerald-700',
  Neutral: 'text-amber-700',
  Negative: 'text-red-700',
};

export const ExplorerTab: React.FC<ExplorerTabProps> = ({ records }) => {
  const [sortKey, setSortKey] = useState<SortKey>('submitted_date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const sorted = useMemo(() => {
    const copy = [...records];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [records, sortKey, sortAsc]);

  const effectivePageSize = pageSize === 0 ? Math.max(1, sorted.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(sorted.length / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * effectivePageSize;
  const pageRows = sorted.slice(startIdx, startIdx + effectivePageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'feedback_id',
      'submitted_date',
      'policy_name',
      'region',
      'channel',
      'language',
      'predicted_sentiment',
      'confidence',
      'feedback_text',
    ];
    const escapeCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...sorted.map((r) =>
        [
          r.feedback_id,
          r.submitted_date,
          r.policy_name,
          r.region,
          r.channel,
          r.language,
          r.predicted_sentiment,
          r.confidence,
          r.feedback_text,
        ]
          .map(escapeCell)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_policy_feedback.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Feedback Explorer</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {sorted.length === 0
                ? 'Showing 0 records'
                : `Showing ${startIdx + 1}–${startIdx + pageRows.length} of ${sorted.length.toLocaleString()} matching records · Click any row to inspect NLP tokens`}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={0}>All rows</option>
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={sorted.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Filtered CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">ID</th>
                <th className="py-2.5 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('submitted_date')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('policy_name')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Policy Scheme <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 whitespace-nowrap">Region</th>
                <th className="py-2.5 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('language')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Lang <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('predicted_sentiment')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Sentiment <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('confidence')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Conf <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 min-w-[280px]">Citizen Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => {
                  const rowKey = `${row.feedback_id}-${startIdx + idx}`;
                  const isSelected = selectedRecordKey === rowKey;
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => {
                        setSelectedRecordKey(isSelected ? null : rowKey);
                        setSelectedRecord(isSelected ? null : row);
                      }}
                      className={`h-10 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {row.feedback_id}
                      </td>
                      <td className="py-2 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {row.submitted_date}
                      </td>
                      <td className="py-2 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {row.policy_name}
                      </td>
                      <td className="py-2 px-4 text-slate-600 whitespace-nowrap">{row.region}</td>
                      <td className="py-2 px-4 text-slate-600 whitespace-nowrap">{row.language}</td>
                      <td className={`py-2 px-4 font-semibold whitespace-nowrap ${SENTIMENT_TEXT_COLOR[row.predicted_sentiment]}`}>
                        {row.predicted_sentiment}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {(row.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-4 text-slate-700 max-w-md truncate">
                        {row.feedback_text}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-mono tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Selected Row Detail Inspection Panel */}
      {selectedRecord && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                {selectedRecord.feedback_id} · {selectedRecord.submitted_date} · {selectedRecord.region} · {selectedRecord.channel}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-1">
                {selectedRecord.policy_name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-800 leading-relaxed">
            {selectedRecord.feedback_text}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Predicted Sentiment: </span>
              <span className={`font-semibold ${SENTIMENT_TEXT_COLOR[selectedRecord.predicted_sentiment]}`}>
                {selectedRecord.predicted_sentiment} ({(selectedRecord.confidence * 100).toFixed(1)}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500">Dataset Label: </span>
              <span className="font-medium text-slate-800">{selectedRecord.sentiment}</span>
            </div>
            <div>
              <span className="text-slate-500">Preprocessed Tokens: </span>
              <span className="font-mono text-slate-700">{selectedRecord.cleaned_text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
