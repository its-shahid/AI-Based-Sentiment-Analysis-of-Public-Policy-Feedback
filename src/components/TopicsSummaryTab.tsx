import React, { useMemo, useState } from 'react';
import { extractTopicsFromRecords, generatePolicySummary } from '../nlp/engine';
import type { FeedbackRecord } from '../types/policy';
import { TopicFrequencyChart } from './Charts';

interface TopicsSummaryTabProps {
  records: FeedbackRecord[];
  selectedPolicy: string;
}

export const TopicsSummaryTab: React.FC<TopicsSummaryTabProps> = ({
  records,
  selectedPolicy,
}) => {
  const [topicCount, setTopicCount] = useState<number>(5);

  const generalTopics = useMemo(
    () => extractTopicsFromRecords(records, topicCount),
    [records, topicCount]
  );

  const concernTopics = useMemo(
    () => extractTopicsFromRecords(records, 4, 'Negative'),
    [records]
  );

  const suggestionTopics = useMemo(
    () => extractTopicsFromRecords(records, 3, 'Neutral'),
    [records]
  );

  const executiveSummary = useMemo(
    () => generatePolicySummary(records, selectedPolicy),
    [records, selectedPolicy]
  );

  if (records.length < 6) {
    return (
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-8 text-center">
        <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
          Insufficient Records for Topic Clustering
        </h2>
        <p className="text-[16px] text-[#475569] mt-2">
          Adjust your sidebar filters so at least 6 feedback rows are active to run topic modeling and plain-language summarization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topic Modeling Interactive Chart + Keyword Index */}
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              Topic Modeling — Dominant Policy Themes
            </h2>
            <p className="text-[15px] text-[#475569] mt-1">
              TF-IDF anchor clustering across {records.length.toLocaleString()} filtered bilingual feedback responses
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label
              htmlFor="topic-count"
              className="text-[15px] font-medium text-[#334155] whitespace-nowrap"
            >
              Topics to extract:
            </label>
            <select
              id="topic-count"
              value={topicCount}
              onChange={(e) => setTopicCount(Number(e.target.value))}
              className="px-3 py-2 text-[15px] font-mono bg-[#F4F7FC] border border-[#CBD8EC] rounded-lg text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} Topics
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <TopicFrequencyChart topics={generalTopics} />
        </div>

        {generalTopics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {generalTopics.map((topic) => (
              <div
                key={topic.topic_id}
                className="p-3.5 rounded-lg bg-[#F4F7FC] border border-[#DCE5F2]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold text-[#0B1F3A]">
                    {topic.topic_id}. {topic.label}
                  </span>
                  <span className="text-[13px] font-mono tabular-nums text-[#2563EB] shrink-0">
                    {topic.share_percent}%
                  </span>
                </div>
                <div className="text-[13px] text-[#475569] mt-1 leading-relaxed">
                  {topic.keywords.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plain-Language Executive Policy Brief & Arguments For / Against */}
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
              Executive Policy Summary — {executiveSummary.policy_name}
            </h2>
            <p className="text-[15px] text-[#475569] mt-1">
              TextRank extractive synthesis summarizing representative arguments for and against the policy
            </p>
          </div>
          <div className="text-[14px] font-mono tabular-nums font-semibold text-[#163A70]">
            {executiveSummary.breakdown.Positive}% Pos · {executiveSummary.breakdown.Neutral}% Neu ·{' '}
            {executiveSummary.breakdown.Negative}% Neg
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-[#F4F7FC] border border-[#DCE5F2] text-[16px] text-[#0B1F3A] leading-relaxed">
          <strong className="font-semibold text-[#163A70]">Plain-Language Policy Verdict: </strong>
          {executiveSummary.plain_language_verdict}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <h3 className="text-[18px] font-semibold text-[#15803D] pb-2.5 border-b border-[#DCFCE7]">
              Arguments For (Positive)
            </h3>
            <ul className="mt-3 space-y-3 text-[15px] text-[#1E293B] leading-relaxed">
              {executiveSummary.positive_highlights.length > 0 ? (
                executiveSummary.positive_highlights.map((item, idx) => (
                  <li key={idx} className="pb-3 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-[14px] text-[#64748B]">
                  No positive arguments matched the current filter.
                </li>
              )}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <h3 className="text-[18px] font-semibold text-[#B91C1C] pb-2.5 border-b border-[#FEE2E2]">
              Arguments Against (Concerns)
            </h3>
            <ul className="mt-3 space-y-3 text-[15px] text-[#1E293B] leading-relaxed">
              {executiveSummary.concern_highlights.length > 0 ? (
                executiveSummary.concern_highlights.map((item, idx) => (
                  <li key={idx} className="pb-3 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-[14px] text-[#64748B]">
                  No critical concerns matched the current filter.
                </li>
              )}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <h3 className="text-[18px] font-semibold text-[#B45309] pb-2.5 border-b border-[#FEF3C7]">
              Citizen Suggestions (Neutral)
            </h3>
            <ul className="mt-3 space-y-3 text-[15px] text-[#1E293B] leading-relaxed">
              {executiveSummary.suggestion_highlights.length > 0 ? (
                executiveSummary.suggestion_highlights.map((item, idx) => (
                  <li key={idx} className="pb-3 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-[14px] text-[#64748B]">
                  No citizen suggestions matched the current filter.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Granular Concerns vs Suggestions Topic Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <h3 className="text-[20px] font-semibold text-[#0B1F3A] pb-3 border-b border-[#E2E8F0]">
            Recurring Concern Clusters
          </h3>
          <div className="divide-y divide-[#E2E8F0] mt-2">
            {concernTopics.length > 0 ? (
              concernTopics.map((t) => (
                <div key={t.topic_id} className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[16px] font-semibold text-[#0B1F3A]">{t.label}</div>
                    <div className="text-[14px] text-[#475569] mt-0.5">
                      {t.keywords.join(' · ')}
                    </div>
                  </div>
                  <span className="text-[14px] font-mono tabular-nums font-semibold text-[#DC2626] shrink-0">
                    {t.document_count} reports
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-[15px] text-[#64748B]">
                Not enough negative records to form clusters.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <h3 className="text-[20px] font-semibold text-[#0B1F3A] pb-3 border-b border-[#E2E8F0]">
            Citizen Suggestion Clusters
          </h3>
          <div className="divide-y divide-[#E2E8F0] mt-2">
            {suggestionTopics.length > 0 ? (
              suggestionTopics.map((t) => (
                <div key={t.topic_id} className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[16px] font-semibold text-[#0B1F3A]">{t.label}</div>
                    <div className="text-[14px] text-[#475569] mt-0.5">
                      {t.keywords.join(' · ')}
                    </div>
                  </div>
                  <span className="text-[14px] font-mono tabular-nums font-semibold text-[#D97706] shrink-0">
                    {t.document_count} proposals
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-[15px] text-[#64748B]">
                Not enough neutral records to form clusters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
