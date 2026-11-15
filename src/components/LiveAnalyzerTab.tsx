import React, { useState } from 'react';
import { predictSingleFeedback, trainMultinomialNB } from '../nlp/engine';
import type { LivePredictionResult, SentimentLabel } from '../types/policy';

interface LiveAnalyzerTabProps {
  model: ReturnType<typeof trainMultinomialNB>;
}

const PRESET_EXAMPLES = [
  {
    label: 'English · Positive',
    text: 'Digital health ID made hospital registration fast and transparent across district clinics.',
  },
  {
    label: 'English · Negative',
    text: 'Subsidy reimbursement for EV two-wheelers has been delayed for six months with poor portal updates.',
  },
  {
    label: 'Hindi · Positive (हिन्दी)',
    text: 'गांव में सोलर माइक्रोग्रिड लगने से शाम की बिजली कटौती समाप्त हो गई है और सिंचाई आसान हुई है।',
  },
  {
    label: 'Hindi · Negative (हिन्दी)',
    text: 'खराब स्मार्ट मीटर के कारण पानी न आने पर भी तीन गुना अधिक बिल आ रहा है और सुनवाई में देरी हो रही है।',
  },
  {
    label: 'Hinglish · Neutral / Suggestion',
    text: 'Bus subsidy accha hai lekin night schedule 11 PM tak extend karna chahiye aur QR ticket add karein.',
  },
];

const SENTIMENT_STYLE: Record<SentimentLabel, { text: string; bar: string }> = {
  Positive: { text: 'text-emerald-700', bar: 'bg-emerald-700' },
  Neutral: { text: 'text-amber-700', bar: 'bg-amber-600' },
  Negative: { text: 'text-red-700', bar: 'bg-red-700' },
};

export const LiveAnalyzerTab: React.FC<LiveAnalyzerTabProps> = ({ model }) => {
  const [inputText, setInputText] = useState<string>(PRESET_EXAMPLES[2].text);
  const [result, setResult] = useState<LivePredictionResult>(() =>
    predictSingleFeedback(PRESET_EXAMPLES[2].text, model)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg('Please enter English, Hindi, or Hinglish feedback text to analyze.');
      return;
    }
    setErrorMsg(null);
    setResult(predictSingleFeedback(inputText, model));
  };

  const applyPreset = (text: string) => {
    setInputText(text);
    setErrorMsg(null);
    setResult(predictSingleFeedback(text, model));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Input Form */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Live Multilingual Sentiment Analyzer
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Test real-time classification on English, Devanagari Hindi (हिन्दी), or Romanized Hinglish citizen comments
        </p>

        <div className="mt-4">
          <div className="text-xs font-medium text-slate-600 mb-2">Load Sample Input:</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => applyPreset(ex.text)}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="mt-4 space-y-3">
          <label htmlFor="live-feedback-input" className="block text-xs font-medium text-slate-700">
            Citizen Policy Feedback Text
          </label>
          <textarea
            id="live-feedback-input"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter feedback in English or Hindi (e.g., सड़क परिवहन सब्सिडी से यात्रियों को बड़ी मदद मिली है)..."
            className="w-full p-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
          {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setInputText('');
                setErrorMsg(null);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Clear Text
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Analyze Sentiment
            </button>
          </div>
        </form>
      </div>

      {/* Right Result Breakdown */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="pb-4 border-b border-slate-100 flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500">Predicted Sentiment</div>
            <div className={`mt-1 text-2xl font-bold ${SENTIMENT_STYLE[result.sentiment].text}`}>
              {result.sentiment}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Confidence · Language</div>
            <div className="mt-1 text-sm font-mono tabular-nums font-semibold text-slate-900">
              {(result.confidence * 100).toFixed(1)}% · {result.language_detected}
            </div>
          </div>
        </div>

        {/* Class Probability Distribution */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700">Class Probability Distribution</div>
          {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((cls) => {
            const probPct = (result.probabilities[cls] * 100).toFixed(1);
            return (
              <div key={cls} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{cls}</span>
                  <span className="font-mono tabular-nums text-slate-800">{probPct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-xs overflow-hidden">
                  <div
                    className={`h-full ${SENTIMENT_STYLE[cls].bar}`}
                    style={{ width: `${probPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Cross-lingual Gloss & Token Diagnostics */}
        <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
          {result.english_gloss && (
            <div>
              <div className="font-semibold text-slate-700 mb-1">
                Cross-Lingual Policy Gloss (Hindi → English):
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 leading-relaxed">
                {result.english_gloss}
              </div>
            </div>
          )}

          <div>
            <div className="font-semibold text-slate-700 mb-1">Preprocessed NLP Tokens:</div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-700 break-words">
              {result.cleaned_text || '(all tokens filtered as stopwords)'}
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-500 font-mono tabular-nums">
            <span>Lexicon Polarity Score: {result.lexicon_score}</span>
            <span>
              Matched Cue Words:{' '}
              {result.matched_keywords.length > 0 ? result.matched_keywords.join(', ') : 'none'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
