import React from 'react';
import {
  CheckCircle2,
  Languages,
  MessageSquareText,
  MinusCircle,
  XCircle,
} from 'lucide-react';
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

  const kpis = [
    {
      label: 'Total Feedback Records',
      value: total.toLocaleString(),
      caption:
        total === totalLoaded
          ? `All ${totalLoaded.toLocaleString()} uploaded rows`
          : `Filtered from ${totalLoaded.toLocaleString()} rows`,
      valueColor: 'text-[#0B1F3A]',
      icon: MessageSquareText,
      iconColor: 'text-[#163A70]',
    },
    {
      label: 'Positive Sentiment',
      value: `${pct(posCount)}%`,
      caption: `${posCount.toLocaleString()} favorable responses`,
      valueColor: 'text-[#15803D]',
      icon: CheckCircle2,
      iconColor: 'text-[#16A34A]',
    },
    {
      label: 'Neutral / Suggestions',
      value: `${pct(neuCount)}%`,
      caption: `${neuCount.toLocaleString()} constructive proposals`,
      valueColor: 'text-[#B45309]',
      icon: MinusCircle,
      iconColor: 'text-[#D97706]',
    },
    {
      label: 'Negative / Concerns',
      value: `${pct(negCount)}%`,
      caption: `${negCount.toLocaleString()} critical issues`,
      valueColor: 'text-[#B91C1C]',
      icon: XCircle,
      iconColor: 'text-[#DC2626]',
    },
    {
      label: 'Hindi Participation',
      value: `${pct(hindiCount)}%`,
      caption: `${hindiCount.toLocaleString()} Hindi / Hinglish rows`,
      valueColor: 'text-[#2563EB]',
      icon: Languages,
      iconColor: 'text-[#2563EB]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 5-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-medium text-[#475569]">{kpi.label}</span>
                <Icon className={`w-5 h-5 shrink-0 ${kpi.iconColor}`} />
              </div>
              <div
                className={`mt-3 text-[34px] leading-none font-bold font-mono tabular-nums ${kpi.valueColor}`}
              >
                {kpi.value}
              </div>
              <div className="mt-2.5 text-[13px] text-[#64748B] font-mono tabular-nums">
                {kpi.caption}
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="mb-3">
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              Monthly Sentiment Trend
            </h2>
            <p className="text-[15px] text-[#475569] mt-1">
              Temporal shift in citizen polarity across public consultation months
            </p>
          </div>
          <MonthlyTrendChart records={records} />
        </div>

        <div className="lg:col-span-5 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="mb-3">
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              Sentiment Distribution
            </h2>
            <p className="text-[15px] text-[#475569] mt-1">
              Aggregate breakdown across Positive, Neutral, and Negative classes
            </p>
          </div>
          <SentimentDonutChart records={records} />
        </div>
      </div>

      {/* Secondary Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="mb-3">
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              Sentiment by Public Policy
            </h2>
            <p className="text-[15px] text-[#475569] mt-1">
              Stacked comparison highlighting high-performing schemes and operational friction
            </p>
          </div>
          <PolicyBreakdownChart records={records} />
        </div>

        <div className="lg:col-span-5 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <div className="mb-3">
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              Language Split Analysis
            </h2>
            <p className="text-[15px] text-[#475569] mt-1">
              Polarity distribution across English, Hindi, and Hinglish citizen submissions
            </p>
          </div>
          <LanguageSplitChart records={records} />
        </div>
      </div>
    </div>
  );
};
