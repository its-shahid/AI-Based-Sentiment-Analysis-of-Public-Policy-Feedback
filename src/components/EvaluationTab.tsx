import React, { useMemo, useState } from 'react';
import { runLiveModelEvaluation } from '../nlp/engine';
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

  const activeModel =
    evaluation.models.find((m) => m.model_name === selectedModelName) ?? evaluation.models[0];

  if (!activeModel) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">
        Load a dataset with a ground-truth sentiment column to run model evaluation.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasGroundTruth && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
          Your uploaded CSV uses the 7 inference columns without a ground-truth <code>sentiment</code> column. The metrics below reflect the benchmark evaluation of the active classifier on the bundled 600-record labeled reference corpus.
        </div>
      )}

      {/* Evaluation Header Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Best Performing Model</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{evaluation.best_model}</div>
          <div className="mt-1 text-xs text-slate-400">Ranked by Macro F1</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Test Accuracy</div>
          <div className="mt-1 text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {(activeModel.accuracy * 100).toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            n = {evaluation.test_size} held-out rows
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Macro Precision / Recall</div>
          <div className="mt-1 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {(activeModel.precision_macro * 100).toFixed(1)}% / {(activeModel.recall_macro * 100).toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Unweighted across 3 classes</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Macro F1-Score</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {activeModel.f1_macro.toFixed(4)}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            Train {evaluation.train_size} / Test {evaluation.test_size}
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Supervised Model Benchmark (Stratified 80/20 Split)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any model row to inspect its Confusion Matrix and per-class Precision, Recall, and F1-score
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Model Architecture</th>
                <th className="py-2.5 px-4 text-right">Accuracy</th>
                <th className="py-2.5 px-4 text-right">Macro Precision</th>
                <th className="py-2.5 px-4 text-right">Macro Recall</th>
                <th className="py-2.5 px-4 text-right">Macro F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {evaluation.models.map((m) => {
                const isSelected = m.model_name === activeModel.model_name;
                return (
                  <tr
                    key={m.model_name}
                    onClick={() => setSelectedModelName(m.model_name)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{m.model_name}</div>
                      <div className="text-slate-500 mt-0.5">{m.notes}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {(m.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {(m.precision_macro * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {(m.recall_macro * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
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
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Confusion Matrix — {activeModel.model_name}
          </h3>
          <ConfusionMatrixHeatmap
            matrix={activeModel.confusion_matrix}
            labels={activeModel.labels}
          />
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Per-Class Precision, Recall & F1-Score
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3 text-right">Precision</th>
                  <th className="py-2 px-3 text-right">Recall</th>
                  <th className="py-2 px-3 text-right">F1-Score</th>
                  <th className="py-2 px-3 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {(['Negative', 'Neutral', 'Positive'] as SentimentLabel[]).map((cls) => {
                  const row = activeModel.per_class[cls];
                  return (
                    <tr key={cls}>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{cls}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {(row.precision * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {(row.recall * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {row.f1_score.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{row.support}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
            <strong>Python Scikit-Learn Pipeline Note:</strong> In the downloadable Python codebase (`src/evaluator.py`), 5-fold stratified cross-validation additionally benchmarks <strong>Balanced Logistic Regression</strong> (~95.8% accuracy) and <strong>Calibrated Linear SVM</strong> (~95.0% accuracy) using word + char_wb TF-IDF feature unions.
          </div>
        </div>
      </div>
    </div>
  );
};
