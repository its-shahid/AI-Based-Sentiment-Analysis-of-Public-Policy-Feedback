import React, { useMemo, useState } from 'react';
import {
  computeTopicRelevance,
  extractTopicsFromRecords,
  runLiveModelEvaluation,
} from '../nlp/engine';
import type { FeedbackRecord, SentimentLabel } from '../types/policy';
import { ConfusionMatrixHeatmap } from './Charts';

interface EvaluationTabProps {
  records: FeedbackRecord[];
  hasGroundTruth: boolean;
  fallbackRecords: FeedbackRecord[];
}

export const EvaluationTab: React.FC<EvaluationTabProps> = ({
  records,
  hasGroundTruth,
  fallbackRecords,
}) => {
  const evalRecords = hasGroundTruth ? records : fallbackRecords;
  const evaluation = useMemo(() => runLiveModelEvaluation(evalRecords), [evalRecords]);
  const [selectedModelName, setSelectedModelName] = useState<string>(
    evaluation.models[0]?.model_name ?? ''
  );

  const topicRelevance = useMemo(() => {
    const activeCorpus = records.length >= 6 ? records : evalRecords;
    const topics = extractTopicsFromRecords(activeCorpus, 5);
    return computeTopicRelevance(topics, activeCorpus);
  }, [records, evalRecords]);

  const activeModel =
    evaluation.models.find((m) => m.model_name === selectedModelName) ?? evaluation.models[0];

  if (!activeModel) {
    return (
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6 text-[16px] text-[#475569]">
        Load a dataset with a ground-truth sentiment column to run supervised model evaluation.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasGroundTruth && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-[15px] text-[#92400E]">
          Your uploaded dataset does not include a ground-truth <code className="font-mono">sentiment</code> column. The supervised metrics below reflect benchmark evaluation on the bundled 600-record labeled reference corpus, while Topic-Extraction Relevance reflects your active corpus.
        </div>
      )}

      {/* Evaluation Header Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-5">
          <div className="text-[14px] font-medium text-[#475569]">Best Performing Model</div>
          <div className="mt-2 text-[18px] font-bold text-[#0B1F3A] leading-snug">
            {evaluation.best_model}
          </div>
          <div className="mt-2 text-[13px] text-[#64748B]">Ranked by Macro F1</div>
        </div>
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-5">
          <div className="text-[14px] font-medium text-[#475569]">Test Accuracy</div>
          <div className="mt-2 text-[32px] leading-none font-bold text-[#2563EB] font-mono tabular-nums">
            {(activeModel.accuracy * 100).toFixed(2)}%
          </div>
          <div className="mt-2 text-[13px] text-[#64748B] font-mono tabular-nums">
            n = {evaluation.test_size} held-out rows
          </div>
        </div>
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-5">
          <div className="text-[14px] font-medium text-[#475569]">Macro Precision / Recall</div>
          <div className="mt-2 text-[28px] leading-none font-bold text-[#0B1F3A] font-mono tabular-nums">
            {(activeModel.precision_macro * 100).toFixed(1)}% / {(activeModel.recall_macro * 100).toFixed(1)}%
          </div>
          <div className="mt-2 text-[13px] text-[#64748B]">Unweighted across 3 classes</div>
        </div>
        <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-5">
          <div className="text-[14px] font-medium text-[#475569]">Macro F1-Score</div>
          <div className="mt-2 text-[32px] leading-none font-bold text-[#15803D] font-mono tabular-nums">
            {activeModel.f1_macro.toFixed(4)}
          </div>
          <div className="mt-2 text-[13px] text-[#64748B] font-mono tabular-nums">
            Train {evaluation.train_size} / Test {evaluation.test_size}
          </div>
        </div>
      </div>

      {/* Topic-Extraction Relevance Metrics */}
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
        <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
          Topic-Extraction Relevance Evaluation
        </h2>
        <p className="text-[15px] text-[#475569] mt-1">
          Quantitative quality checks for extracted themes across {records.length.toLocaleString()} active documents
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-[#F4F7FC] border border-[#DCE5F2]">
            <div className="text-[14px] font-medium text-[#475569]">Topic Distinctiveness</div>
            <div className="mt-2 text-[30px] leading-none font-bold text-[#0B1F3A] font-mono tabular-nums">
              {topicRelevance.distinctiveness.toFixed(4)}
            </div>
            <div className="mt-1.5 text-[13px] text-[#64748B]">
              Unique keyword ratio across top terms (1.0 = zero overlap)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F7FC] border border-[#DCE5F2]">
            <div className="text-[14px] font-medium text-[#475569]">Coherence Score (NPMI)</div>
            <div className="mt-2 text-[30px] leading-none font-bold text-[#2563EB] font-mono tabular-nums">
              {topicRelevance.coherence.toFixed(4)}
            </div>
            <div className="mt-1.5 text-[13px] text-[#64748B]">
              Normalized pointwise mutual information between cluster terms
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F7FC] border border-[#DCE5F2]">
            <div className="text-[14px] font-medium text-[#475569]">Corpus Topic Coverage</div>
            <div className="mt-2 text-[30px] leading-none font-bold text-[#15803D] font-mono tabular-nums">
              {topicRelevance.coveragePercent.toFixed(1)}%
            </div>
            <div className="mt-1.5 text-[13px] text-[#64748B]">
              Share of feedback records mapped to extracted policy themes
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
            Supervised Model Benchmark (Stratified 80/20 Split)
          </h2>
          <p className="text-[15px] text-[#475569] mt-1">
            Click any model row to inspect its interactive Confusion Matrix and per-class Precision, Recall, and F1-score
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7FC] border-b border-[#DCE5F2] text-[14px] font-semibold text-[#163A70]">
                <th className="py-3 px-4">Model Architecture</th>
                <th className="py-3 px-4 text-right">Accuracy</th>
                <th className="py-3 px-4 text-right">Macro Precision</th>
                <th className="py-3 px-4 text-right">Macro Recall</th>
                <th className="py-3 px-4 text-right">Macro F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[15px]">
              {evaluation.models.map((m) => {
                const isSelected = m.model_name === activeModel.model_name;
                return (
                  <tr
                    key={m.model_name}
                    onClick={() => setSelectedModelName(m.model_name)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F4F7FC]'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0B1F3A]">{m.model_name}</div>
                      <div className="text-[14px] text-[#475569] mt-0.5">{m.notes}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#0B1F3A]">
                      {(m.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#334155]">
                      {(m.precision_macro * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#334155]">
                      {(m.recall_macro * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#2563EB]">
                      {m.f1_macro.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion Matrix & Per-Class Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <h3 className="text-[20px] font-semibold text-[#0B1F3A] mb-3">
            Confusion Matrix — {activeModel.model_name}
          </h3>
          <ConfusionMatrixHeatmap
            matrix={activeModel.confusion_matrix}
            labels={activeModel.labels}
          />
        </div>

        <div className="lg:col-span-6 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
          <h3 className="text-[20px] font-semibold text-[#0B1F3A] mb-3">
            Per-Class Precision, Recall & F1-Score
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[15px]">
              <thead>
                <tr className="bg-[#F4F7FC] border-b border-[#DCE5F2] text-[#163A70] font-semibold text-[14px]">
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-right">Precision</th>
                  <th className="py-2.5 px-3 text-right">Recall</th>
                  <th className="py-2.5 px-3 text-right">F1-Score</th>
                  <th className="py-2.5 px-3 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono tabular-nums">
                {(['Negative', 'Neutral', 'Positive'] as SentimentLabel[]).map((cls) => {
                  const row = activeModel.per_class[cls];
                  return (
                    <tr key={cls}>
                      <td className="py-3 px-3 font-sans font-semibold text-[#0B1F3A]">{cls}</td>
                      <td className="py-3 px-3 text-right text-[#334155]">
                        {(row.precision * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right text-[#334155]">
                        {(row.recall * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#0B1F3A]">
                        {row.f1_score.toFixed(4)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#64748B]">{row.support}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-[14px] text-[#475569] leading-relaxed">
            <strong className="text-[#0B1F3A]">Python Scikit-Learn Pipeline Note:</strong> In the downloadable Python codebase (<code className="font-mono text-[#163A70]">src/evaluator.py</code>), 5-fold stratified cross-validation additionally benchmarks <strong>Balanced Logistic Regression</strong> (~95.8% accuracy) and <strong>Calibrated Linear SVM</strong> (~95.0% accuracy) using word + char_wb TF-IDF feature unions.
          </div>
        </div>
      </div>
    </div>
  );
};
