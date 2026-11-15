import React, { useMemo, useState } from 'react';
import { extractTopicsFromRecords, generatePolicySummary } from '../nlp/engine';
import type { FeedbackRecord } from '../types/policy';

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
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <h3 className="text-base font-semibold text-slate-900">Insufficient Records for Clustering</h3>
        <p className="text-sm text-slate-500 mt-1">
          Adjust your sidebar filters so at least 6 feedback rows are included to run topic modeling and summarization.
        </p>
      </div>
    );
  }

  const maxDocs = Math.max(1, ...generalTopics.map((t) => t.document_count));

  return (
    <div className="space-y-6">
      {/* General Topic Modeling Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Topic Modeling — Dominant Policy Themes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              TF-IDF anchor clustering across {records.length} filtered bilingual feedback responses
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="topic-count" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Topics to extract:
            </label>
            <select
              id="topic-count"
              value={topicCount}
              onChange={(e) => setTopicCount(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} Topics
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {generalTopics.map((topic) => (
            <div key={topic.topic_id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
              <div className="md:col-span-4">
                <div className="text-sm font-semibold text-slate-900">
                  {topic.topic_id}. {topic.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {topic.keywords.join(' · ')}
                </div>
              </div>
              <div className="md:col-span-6">
                <div className="h-2.5 w-full bg-slate-100 rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-blue-700"
                    style={{ width: `${(topic.document_count / maxDocs) * 100}%` }}
                  />
                </div>
              </div>
              <div className="md:col-span-2 text-right font-mono tabular-nums text-xs text-slate-700">
                {topic.document_count} docs ({topic.share_percent}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automatic Extractive Opinion Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Automatic Public Opinion Summary — {executiveSummary.policy_name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              TextRank cosine-similarity extractive synthesis across Positive, Negative, and Neutral submissions
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-600">
            {executiveSummary.breakdown.Positive}% Pos · {executiveSummary.breakdown.Neutral}% Neu ·{' '}
            {executiveSummary.breakdown.Negative}% Neg
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
          <div>
            <h3 className="text-sm font-semibold text-emerald-800 pb-2 border-b border-emerald-100">
              Praised Outcomes (Positive)
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-700 leading-relaxed">
              {executiveSummary.positive_highlights.length > 0 ? (
                executiveSummary.positive_highlights.map((item, idx) => (
                  <li key={idx} className="pb-2.5 border-b border-slate-100 last:border-b-0">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400">No positive highlights in current filter.</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-red-800 pb-2 border-b border-red-100">
              Common Concerns (Negative)
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-700 leading-relaxed">
              {executiveSummary.concern_highlights.length > 0 ? (
                executiveSummary.concern_highlights.map((item, idx) => (
                  <li key={idx} className="pb-2.5 border-b border-slate-100 last:border-b-0">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400">No negative concerns in current filter.</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-800 pb-2 border-b border-amber-100">
              Citizen Suggestions (Neutral)
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-700 leading-relaxed">
              {executiveSummary.suggestion_highlights.length > 0 ? (
                executiveSummary.suggestion_highlights.map((item, idx) => (
                  <li key={idx} className="pb-2.5 border-b border-slate-100 last:border-b-0">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400">No suggestions in current filter.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Granular Concerns vs Suggestions Topic Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
            Concern Topic Clusters (From Negative Feedback)
          </h3>
          <div className="divide-y divide-slate-100 mt-2">
            {concernTopics.length > 0 ? (
              concernTopics.map((t) => (
                <div key={t.topic_id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.keywords.join(' · ')}</div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-red-700 shrink-0">
                    {t.document_count} reports
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-xs text-slate-400">Not enough negative records to cluster.</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
            Suggestion Topic Clusters (From Neutral Feedback)
          </h3>
          <div className="divide-y divide-slate-100 mt-2">
            {suggestionTopics.length > 0 ? (
              suggestionTopics.map((t) => (
                <div key={t.topic_id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.keywords.join(' · ')}</div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-amber-700 shrink-0">
                    {t.document_count} proposals
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-xs text-slate-400">Not enough neutral records to cluster.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
