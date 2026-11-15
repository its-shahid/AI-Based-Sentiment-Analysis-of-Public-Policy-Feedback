import React, { useState } from 'react';
import type { FeedbackRecord, SentimentLabel } from '../types/policy';

const COLORS: Record<SentimentLabel, string> = {
  Positive: '#15803D',
  Neutral: '#B45309',
  Negative: '#B91C1C',
};

const BG_TINTS: Record<SentimentLabel, string> = {
  Positive: '#DCFCE7',
  Neutral: '#FEF3C7',
  Negative: '#FEE2E2',
};

export const MonthlyTrendChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const monthMap = new Map<string, Record<SentimentLabel, number>>();
  for (const r of records) {
    if (!monthMap.has(r.month)) {
      monthMap.set(r.month, { Positive: 0, Neutral: 0, Negative: 0 });
    }
    const entry = monthMap.get(r.month)!;
    entry[r.predicted_sentiment] += 1;
  }

  const series = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, counts]) => ({ month, ...counts }));

  if (series.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-500">
        No monthly trend data available for current filters.
      </div>
    );
  }

  const width = 620;
  const height = 240;
  const pad = { top: 18, right: 20, bottom: 32, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = Math.max(
    4,
    ...series.flatMap((d) => [d.Positive, d.Neutral, d.Negative])
  );
  const yMax = Math.ceil(maxVal / 5) * 5;

  const xPos = (idx: number) =>
    series.length === 1
      ? pad.left + plotW / 2
      : pad.left + (idx / (series.length - 1)) * plotW;

  const yPos = (val: number) => pad.top + plotH - (val / yMax) * plotH;

  const buildPath = (key: SentimentLabel) =>
    series
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(d[key]).toFixed(1)}`)
      .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * yMax));

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-5 mb-2 text-xs text-slate-600">
        {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ backgroundColor: COLORS[s] }} />
            {s}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {yTicks.map((tick) => {
          const y = yPos(tick);
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((s) => (
          <path
            key={s}
            d={buildPath(s)}
            fill="none"
            stroke={COLORS[s]}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {series.map((d, idx) => {
          const x = xPos(idx);
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={d.month}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x - 16}
                y={pad.top}
                width={32}
                height={plotH}
                fill="transparent"
              />
              {isHovered && (
                <line
                  x1={x}
                  x2={x}
                  y1={pad.top}
                  y2={pad.top + plotH}
                  stroke="#94A3B8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}
              {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((s) => (
                <circle
                  key={s}
                  cx={x}
                  cy={yPos(d[s])}
                  r={isHovered ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke={COLORS[s]}
                  strokeWidth={2}
                />
              ))}
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {d.month.slice(5)}/{d.month.slice(2, 4)}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && series[hoveredIdx] && (
        <div className="mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-md flex items-center justify-between font-mono tabular-nums">
          <span>{series[hoveredIdx].month}</span>
          <span className="text-emerald-300">Pos: {series[hoveredIdx].Positive}</span>
          <span className="text-amber-300">Neu: {series[hoveredIdx].Neutral}</span>
          <span className="text-red-300">Neg: {series[hoveredIdx].Negative}</span>
        </div>
      )}
    </div>
  );
};

export const SentimentDonutChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const counts: Record<SentimentLabel, number> = { Positive: 0, Neutral: 0, Negative: 0 };
  for (const r of records) counts[r.predicted_sentiment] += 1;
  const total = records.length || 1;

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const items: SentimentLabel[] = ['Positive', 'Neutral', 'Negative'];

  let offsetAcc = 0;
  const segments = items.map((label) => {
    const val = counts[label];
    const frac = val / total;
    const len = frac * circumference;
    const seg = { label, val, pct: ((val / total) * 100).toFixed(1), len, offset: -offsetAcc };
    offsetAcc += len;
    return seg;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="22" />
          {records.length > 0 &&
            segments.map((seg) => (
              <circle
                key={seg.label}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={COLORS[seg.label]}
                strokeWidth="22"
                strokeDasharray={`${seg.len} ${circumference}`}
                strokeDashoffset={seg.offset}
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {records.length.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">Responses</span>
        </div>
      </div>

      <div className="w-full max-w-xs divide-y divide-slate-100">
        {segments.map((seg) => (
          <div key={seg.label} className="py-2.5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: COLORS[seg.label] }}
              />
              <span className="font-medium text-slate-800">{seg.label}</span>
            </div>
            <div className="font-mono tabular-nums text-slate-700">
              <span className="font-semibold text-slate-900">{seg.val}</span>
              <span className="text-slate-400 ml-2">({seg.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PolicyBreakdownChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const map = new Map<string, Record<SentimentLabel, number>>();
  for (const r of records) {
    if (!map.has(r.policy_name)) map.set(r.policy_name, { Positive: 0, Neutral: 0, Negative: 0 });
    map.get(r.policy_name)![r.predicted_sentiment] += 1;
  }

  const rows = Array.from(map.entries())
    .map(([policy, counts]) => ({
      policy,
      ...counts,
      total: counts.Positive + counts.Neutral + counts.Negative,
    }))
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) {
    return <div className="text-sm text-slate-500 py-8 text-center">No policies in current selection.</div>;
  }

  return (
    <div className="space-y-3.5">
      {rows.map((row) => {
        const posW = (row.Positive / row.total) * 100;
        const neuW = (row.Neutral / row.total) * 100;
        const negW = (row.Negative / row.total) * 100;
        return (
          <div key={row.policy} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-xs">
              <span className="font-medium text-slate-800 truncate">{row.policy}</span>
              <span className="font-mono tabular-nums text-slate-500 shrink-0">
                {row.Positive}+ · {row.Neutral}~ · {row.Negative}- ({row.total})
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-xs overflow-hidden flex">
              <div
                style={{ width: `${posW}%`, backgroundColor: COLORS.Positive }}
                title={`Positive: ${row.Positive}`}
              />
              <div
                style={{ width: `${neuW}%`, backgroundColor: COLORS.Neutral }}
                title={`Neutral: ${row.Neutral}`}
              />
              <div
                style={{ width: `${negW}%`, backgroundColor: COLORS.Negative }}
                title={`Negative: ${row.Negative}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LanguageSplitChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const map = new Map<string, Record<SentimentLabel, number>>();
  for (const r of records) {
    if (!map.has(r.language)) map.set(r.language, { Positive: 0, Neutral: 0, Negative: 0 });
    map.get(r.language)![r.predicted_sentiment] += 1;
  }

  const rows = Array.from(map.entries()).map(([lang, counts]) => ({
    lang,
    ...counts,
    total: counts.Positive + counts.Neutral + counts.Negative,
  }));

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.lang} className="border-b border-slate-100 last:border-b-0 pb-3.5 last:pb-0">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-900">{row.lang}</span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              {row.total} responses ({((row.total / (records.length || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
            {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((s) => (
              <div
                key={s}
                className="px-2.5 py-1.5 rounded-sm flex items-center justify-between"
                style={{ backgroundColor: BG_TINTS[s], color: COLORS[s] }}
              >
                <span>{s}</span>
                <span className="font-semibold">{row[s]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ConfusionMatrixHeatmap: React.FC<{
  matrix: number[][];
  labels: SentimentLabel[];
}> = ({ matrix, labels }) => {
  const maxVal = Math.max(1, ...matrix.flat());

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="text-xs text-slate-500 mb-2 text-center font-medium">
          Predicted Label (Columns) vs. Actual Ground Truth (Rows)
        </div>
        <table className="w-full border-collapse text-sm font-mono tabular-nums">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                Actual \ Pred
              </th>
              {labels.map((lbl) => (
                <th
                  key={lbl}
                  className="p-2 text-center text-xs font-semibold text-slate-700 border-b border-slate-200"
                >
                  {lbl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rIdx) => (
              <tr key={labels[rIdx]}>
                <td className="p-2.5 text-xs font-semibold text-slate-700 border-r border-slate-200">
                  {labels[rIdx]}
                </td>
                {row.map((val, cIdx) => {
                  const intensity = val / maxVal;
                  const isDiag = rIdx === cIdx;
                  const bg = isDiag
                    ? `rgba(29, 78, 216, ${0.14 + intensity * 0.72})`
                    : `rgba(220, 38, 38, ${val === 0 ? 0.02 : 0.08 + intensity * 0.35})`;
                  const textColor = isDiag && intensity > 0.45 ? '#FFFFFF' : '#0F172A';
                  return (
                    <td
                      key={labels[cIdx]}
                      className="p-3 text-center border border-slate-200 font-semibold"
                      style={{ backgroundColor: bg, color: textColor }}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
