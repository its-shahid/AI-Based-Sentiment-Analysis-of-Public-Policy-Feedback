import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Download } from 'lucide-react';
import type { FeedbackRecord, SentimentLabel } from '../types/policy';

interface ExplorerTabProps {
  records: FeedbackRecord[];
}

type SortKey = 'submitted_date' | 'policy_name' | 'language' | 'predicted_sentiment' | 'confidence';

const SENTIMENT_TEXT_COLOR: Record<SentimentLabel, string> = {
  Positive: 'text-[#15803D]',
  Neutral: 'text-[#B45309]',
  Negative: 'text-[#B91C1C]',
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
    <div className="space-y-6">
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">Feedback Explorer</h2>
            <p className="text-[14px] text-[#475569] mt-1 font-mono tabular-nums">
              {sorted.length === 0
                ? 'Showing 0 records'
                : `Showing ${startIdx + 1}–${startIdx + pageRows.length} of ${sorted.length.toLocaleString()} matching records · Click any row to inspect NLP tokens`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-[14px] font-mono bg-[#F4F7FC] border border-[#CBD8EC] rounded-lg text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
              className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Filtered CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7FC] border-b border-[#DCE5F2] text-[14px] font-semibold text-[#163A70]">
                <th className="py-3 px-4 whitespace-nowrap">ID</th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('submitted_date')}
                    className="inline-flex items-center gap-1 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    Date <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('policy_name')}
                    className="inline-flex items-center gap-1 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    Policy Scheme <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Region</th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('language')}
                    className="inline-flex items-center gap-1 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    Lang <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('predicted_sentiment')}
                    className="inline-flex items-center gap-1 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    Sentiment <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('confidence')}
                    className="inline-flex items-center gap-1 hover:text-[#0B1F3A] cursor-pointer"
                  >
                    Conf <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[300px]">Citizen Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[15px]">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#64748B]">
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
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F4F7FC]'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-[14px] text-[#475569] whitespace-nowrap">
                        {row.feedback_id}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[14px] text-[#334155] whitespace-nowrap">
                        {row.submitted_date}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0B1F3A] whitespace-nowrap">
                        {row.policy_name}
                      </td>
                      <td className="py-3 px-4 text-[#475569] whitespace-nowrap">{row.region}</td>
                      <td className="py-3 px-4 text-[#475569] whitespace-nowrap">{row.language}</td>
                      <td
                        className={`py-3 px-4 font-semibold whitespace-nowrap ${
                          SENTIMENT_TEXT_COLOR[row.predicted_sentiment]
                        }`}
                      >
                        {row.predicted_sentiment}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[14px] text-[#0B1F3A] whitespace-nowrap">
                        {(row.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-[#1E293B] max-w-md truncate">
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
        <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-[14px] text-[#334155]">
          <span className="font-mono tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 bg-white border border-[#CBD8EC] rounded-lg hover:bg-[#EFF6FF] disabled:opacity-40 font-medium cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3.5 py-1.5 bg-white border border-[#CBD8EC] rounded-lg hover:bg-[#EFF6FF] disabled:opacity-40 font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Selected Row Detail Inspection Panel */}
      {selectedRecord && (
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="text-[14px] text-[#475569] font-mono tabular-nums">
                {selectedRecord.feedback_id} · {selectedRecord.submitted_date} ·{' '}
                {selectedRecord.region} · {selectedRecord.channel}
              </div>
              <h3 className="text-[20px] font-semibold text-[#0B1F3A] mt-1">
                {selectedRecord.policy_name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRecord(null);
                setSelectedRecordKey(null);
              }}
              className="text-[14px] font-semibold text-[#163A70] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="mt-4 text-[16px] text-[#0B1F3A] leading-relaxed">
            {selectedRecord.feedback_text}
          </p>
          <div className="mt-4 pt-4 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-3 gap-4 text-[14px]">
            <div>
              <span className="text-[#475569]">Predicted Sentiment: </span>
              <span
                className={`font-semibold ${
                  SENTIMENT_TEXT_COLOR[selectedRecord.predicted_sentiment]
                }`}
              >
                {selectedRecord.predicted_sentiment} ({(selectedRecord.confidence * 100).toFixed(1)}%)
              </span>
            </div>
            <div>
              <span className="text-[#475569]">Dataset Label: </span>
              <span className="font-semibold text-[#0B1F3A]">{selectedRecord.sentiment}</span>
            </div>
            <div>
              <span className="text-[#475569]">Preprocessed Tokens: </span>
              <span className="font-mono text-[#163A70]">{selectedRecord.cleaned_text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
