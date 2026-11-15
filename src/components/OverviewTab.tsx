import React from 'react';
import type { FeedbackRecord } from '../types/policy';
import {
  LanguageSplitChart,
  MonthlyTrendChart,
  PolicyBreakdownChart,
  SentimentDonutChart,
} from './Charts';

interface OverviewTabProps {
  records: FeedbackRecord[];
  totalLoaded: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ records, totalLoaded }) => {
  const total = records.length;
  const posCount = records.filter((r) => r.predicted_sentiment === 'Positive').length;
  const neuCount = records.filter((r) => r.predicted_sentiment === 'Neutral').length;
  const negCount = records.filter((r) => r.predicted_sentiment === 'Negative').length;
  const hindiCount = records.filter((r) => r.language.toLowerCase().includes('hindi')).length;

  const pct = (count: number) => (total > 0 ? ((count / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="space-y-6">
      {/* 5-Column KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Feedback Records</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {total.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {total === totalLoaded
              ? `All ${totalLoaded.toLocaleString()} uploaded rows`
              : `of ${totalLoaded.toLocaleString()} uploaded rows`}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Positive Sentiment</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {pct(posCount)}%
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {posCount.toLocaleString()} favorable
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Neutral / Suggestions</div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {pct(neuCount)}%
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {neuCount.toLocaleString()} constructive
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Negative / Concerns</div>
          <div className="mt-1.5 text-2xl font-bold text-red-700 font-mono tabular-nums">
            {pct(negCount)}%
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {negCount.toLocaleString()} grievances
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 col-span-2 md:col-span-1">
          <div className="text-xs text-slate-500">Hindi Participation</div>
          <div className="mt-1.5 text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {pct(hindiCount)}%
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {hindiCount.toLocaleString()} Devanagari rows
          </div>
        </div>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Monthly Sentiment Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Temporal shift in citizen polarity across public consultation months
            </p>
          </div>
          <MonthlyTrendChart records={records} />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Sentiment Distribution</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregate breakdown across Positive, Neutral, and Negative classes
            </p>
          </div>
          <SentimentDonutChart records={records} />
        </div>
      </div>

      {/* Secondary Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Sentiment by Public Policy</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Stacked comparison highlighting high-performing schemes and friction areas
            </p>
          </div>
          <PolicyBreakdownChart records={records} />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Language Split Analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Polarity distribution across English and Hindi citizen submissions
            </p>
          </div>
          <LanguageSplitChart records={records} />
        </div>
      </div>
    </div>
  );
};
