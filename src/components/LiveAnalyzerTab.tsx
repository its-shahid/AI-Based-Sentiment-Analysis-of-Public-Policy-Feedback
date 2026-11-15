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
  Positive: { text: 'text-[#15803D]', bar: 'bg-[#16A34A]' },
  Neutral: { text: 'text-[#B45309]', bar: 'bg-[#D97706]' },
  Negative: { text: 'text-[#B91C1C]', bar: 'bg-[#DC2626]' },
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
      <div className="lg:col-span-7 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6">
        <h2 className="text-[22px] font-semibold text-[#0B1F3A]">
          Live Multilingual Sentiment Analyzer
        </h2>
        <p className="text-[15px] text-[#475569] mt-1">
          Test real-time classification on English, Devanagari Hindi (हिन्दी), or Romanized Hinglish citizen comments
        </p>

        <div className="mt-5">
          <div className="text-[14px] font-semibold text-[#163A70] mb-2.5">Load Sample Input:</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => applyPreset(ex.text)}
                className="px-3 py-1.5 text-[14px] font-medium bg-[#F4F7FC] hover:bg-[#E0EAFF] text-[#0B1F3A] border border-[#DCE5F2] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="mt-5 space-y-3.5">
          <label
            htmlFor="live-feedback-input"
            className="block text-[15px] font-semibold text-[#0B1F3A]"
          >
            Citizen Policy Feedback Text
          </label>
          <textarea
            id="live-feedback-input"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter feedback in English or Hindi (e.g., सड़क परिवहन सब्सिडी से यात्रियों को बड़ी मदद मिली है)..."
            className="w-full p-3.5 text-[16px] text-[#0B1F3A] bg-[#F4F7FC] border border-[#CBD8EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white leading-relaxed"
          />
          {errorMsg && <p className="text-[14px] text-[#DC2626] font-medium">{errorMsg}</p>}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setInputText('');
                setErrorMsg(null);
              }}
              className="px-3.5 py-2 text-[15px] font-medium text-[#475569] hover:text-[#0B1F3A] cursor-pointer"
            >
              Clear Text
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-[15px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Analyze Sentiment
            </button>
          </div>
        </form>
      </div>

      {/* Right Result Breakdown */}
      <div className="lg:col-span-5 bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-6 space-y-5">
        <div className="pb-4 border-b border-[#E2E8F0] flex items-baseline justify-between gap-4">
          <div>
            <div className="text-[14px] text-[#475569]">Predicted Sentiment</div>
            <div className={`mt-1 text-[34px] leading-none font-bold ${SENTIMENT_STYLE[result.sentiment].text}`}>
              {result.sentiment}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[14px] text-[#475569]">Confidence · Language</div>
            <div className="mt-1 text-[16px] font-mono tabular-nums font-semibold text-[#0B1F3A]">
              {(result.confidence * 100).toFixed(1)}% · {result.language_detected}
            </div>
          </div>
        </div>

        {/* Class Probability Distribution */}
        <div className="space-y-3.5">
          <div className="text-[15px] font-semibold text-[#0B1F3A]">Class Probability Distribution</div>
          {(['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map((cls) => {
            const probPct = (result.probabilities[cls] * 100).toFixed(1);
            return (
              <div key={cls} className="space-y-1.5">
                <div className="flex items-center justify-between text-[15px]">
                  <span className="font-medium text-[#1E293B]">{cls}</span>
                  <span className="font-mono tabular-nums font-semibold text-[#0B1F3A]">
                    {probPct}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#F4F7FC] rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${SENTIMENT_STYLE[cls].bar}`}
                    style={{ width: `${probPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Cross-lingual Gloss & Token Diagnostics */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-3.5 text-[14px]">
          {result.english_gloss && (
            <div>
              <div className="font-semibold text-[#163A70] mb-1.5">
                Cross-Lingual Policy Gloss (Hindi → English):
              </div>
              <div className="p-3 bg-[#F4F7FC] border border-[#DCE5F2] rounded-lg text-[#0B1F3A] leading-relaxed">
                {result.english_gloss}
              </div>
            </div>
          )}

          <div>
            <div className="font-semibold text-[#163A70] mb-1.5">Preprocessed NLP Tokens:</div>
            <div className="p-3 bg-[#F4F7FC] border border-[#DCE5F2] rounded-lg font-mono text-[13px] text-[#0B1F3A] break-words">
              {result.cleaned_text || '(all tokens filtered as stopwords)'}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[#475569] font-mono tabular-nums text-[13px]">
            <span>Lexicon Polarity: {result.lexicon_score}</span>
            <span>
              Matched Cues:{' '}
              {result.matched_keywords.length > 0 ? result.matched_keywords.join(', ') : 'none'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
