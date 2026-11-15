export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative';

export type SupportedFileType = 'CSV' | 'Excel' | 'JSON' | 'TXT' | 'PDF';

export interface FeedbackRecord {
  feedback_id: string;
  submitted_date: string;
  month: string;
  policy_name: string;
  region: string;
  channel: string;
  language: string;
  feedback_text: string;
  sentiment: SentimentLabel;
  predicted_sentiment: SentimentLabel;
  confidence: number;
  cleaned_text: string;
}

export interface IngestionMetadata {
  fileName: string;
  fileType: SupportedFileType;
  rawRowCount: number;
  validRowCount: number;
  droppedEmptyCount: number;
  detectedColumns: Record<string, string>;
  inferredColumns: string[];
  hasGroundTruth: boolean;
}

export interface TopicCluster {
  topic_id: number;
  label: string;
  keywords: string[];
  document_count: number;
  share_percent: number;
}

export interface TopicRelevanceMetrics {
  distinctiveness: number;
  coherence: number;
  coveragePercent: number;
}

export interface PolicyExecutiveSummary {
  policy_name: string;
  total_responses: number;
  breakdown: Record<SentimentLabel, number>;
  plain_language_verdict: string;
  positive_highlights: string[];
  concern_highlights: string[];
  suggestion_highlights: string[];
}

export interface PerClassMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface ModelBenchmarkResult {
  model_name: string;
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  confusion_matrix: number[][];
  labels: SentimentLabel[];
  per_class: Record<SentimentLabel, PerClassMetrics>;
  notes: string;
}

export interface EvaluationSummary {
  dataset_size: number;
  train_size: number;
  test_size: number;
  best_model: string;
  models: ModelBenchmarkResult[];
}

export interface LivePredictionResult {
  sentiment: SentimentLabel;
  confidence: number;
  probabilities: Record<SentimentLabel, number>;
  language_detected: string;
  cleaned_text: string;
  english_gloss: string | null;
  lexicon_score: number;
  matched_keywords: string[];
}

export interface ProjectFileEntry {
  path: string;
  name: string;
  folder: string;
  content: string;
  extension: string;
}
