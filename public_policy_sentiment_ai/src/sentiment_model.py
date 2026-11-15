"""
Sentiment classification module combining TF-IDF (word + character n-grams)
with classical ML classifiers (Logistic Regression, Multinomial Naive Bayes,
Linear SVC with probability calibration) and bilingual lexicon fusion.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from .config import (
    BEST_MODEL_PATH,
    MODELS_DIR,
    RANDOM_STATE,
    SENTIMENT_CLASSES,
    TFIDF_MAX_FEATURES,
    TFIDF_NGRAM_RANGE,
)
from .multilingual import compute_lexicon_polarity, detect_language_label
from .preprocessor import clean_text

logger = logging.getLogger(__name__)


def build_feature_union() -> FeatureUnion:
    """
    Build a combined word + character-wb TF-IDF feature extractor.
    Character n-grams (3, 5) capture morphological stems in both English and Devanagari Hindi.
    """
    word_tfidf = TfidfVectorizer(
        ngram_range=TFIDF_NGRAM_RANGE,
        max_features=TFIDF_MAX_FEATURES,
        sublinear_tf=True,
        token_pattern=r"(?u)\b[\w\u0900-\u097F]{2,}\b",
    )
    char_tfidf = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=TFIDF_MAX_FEATURES,
        sublinear_tf=True,
    )
    return FeatureUnion([("word_tfidf", word_tfidf), ("char_tfidf", char_tfidf)])


def get_candidate_models() -> Dict[str, Pipeline]:
    """Return dictionary of candidate sklearn Pipelines ready for benchmarking."""
    return {
        "Logistic Regression": Pipeline([
            ("features", build_feature_union()),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000,
                    C=2.0,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]),
        "Multinomial Naive Bayes": Pipeline([
            ("features", build_feature_union()),
            ("clf", MultinomialNB(alpha=0.5)),
        ]),
        "Linear SVM (Calibrated)": Pipeline([
            ("features", build_feature_union()),
            (
                "clf",
                CalibratedClassifierCV(
                    estimator=LinearSVC(
                        C=1.0,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                    ),
                    cv=3,
                ),
            ),
        ]),
    }


class PolicySentimentAnalyzer:
    """Wrapper for training, persisting, loading, and running hybrid sentiment inference."""

    def __init__(self, model_path: Path = BEST_MODEL_PATH):
        self.model_path = Path(model_path)
        self.pipeline: Optional[Pipeline] = None
        self.model_name: str = "Logistic Regression"

    def fit(self, texts: pd.Series, labels: pd.Series, model_name: str = "Logistic Regression") -> "PolicySentimentAnalyzer":
        candidates = get_candidate_models()
        if model_name not in candidates:
            raise ValueError(f"Unknown model '{model_name}'. Choose from {list(candidates.keys())}")
        self.model_name = model_name
        self.pipeline = candidates[model_name]
        self.pipeline.fit(texts.astype(str), labels.astype(str))
        return self

    def save(self) -> Path:
        if self.pipeline is None:
            raise RuntimeError("Cannot save an untrained PolicySentimentAnalyzer.")
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        payload = {"model_name": self.model_name, "pipeline": self.pipeline}
        joblib.dump(payload, self.model_path)
        logger.info("Saved sentiment pipeline (%s) to %s", self.model_name, self.model_path)
        return self.model_path

    def load(self) -> "PolicySentimentAnalyzer":
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model file not found at '{self.model_path}'. Run 'python run_pipeline.py' first."
            )
        payload = joblib.load(self.model_path)
        self.model_name = payload["model_name"]
        self.pipeline = payload["pipeline"]
        return self

    def predict_single(self, raw_text: str) -> Dict[str, Any]:
        """
        Predict sentiment for a single English, Hindi, or Hinglish feedback comment.
        Blends ML classifier probabilities with bilingual lexicon polarity for robustness.
        """
        if not isinstance(raw_text, str) or not raw_text.strip():
            raise ValueError("Input feedback text must be a non-empty string.")

        detected_lang = detect_language_label(raw_text)
        cleaned = clean_text(raw_text, remove_stopwords=True) or clean_text(raw_text, remove_stopwords=False)
        lex_scores = compute_lexicon_polarity(raw_text)

        if self.pipeline is not None:
            probs = self.pipeline.predict_proba([cleaned])[0]
            classes = list(self.pipeline.classes_)
            ml_prob_map = {cls: float(prob) for cls, prob in zip(classes, probs)}
        else:
            ml_prob_map = {cls: lex_scores[cls] for cls in SENTIMENT_CLASSES}

        # Hybrid blend (80% ML model + 20% bilingual lexicon when ML model is loaded)
        blended: Dict[str, float] = {}
        weight_ml = 0.80 if self.pipeline is not None else 0.0
        weight_lex = 1.0 - weight_ml
        for cls in SENTIMENT_CLASSES:
            blended[cls] = round(
                weight_ml * ml_prob_map.get(cls, 0.0) + weight_lex * lex_scores.get(cls, 0.0),
                4,
            )

        # Normalize probabilities
        total = sum(blended.values()) or 1.0
        blended = {k: round(v / total, 4) for k, v in blended.items()}
        predicted_label = max(blended, key=lambda k: blended[k])

        return {
            "sentiment": predicted_label,
            "confidence": round(blended[predicted_label], 4),
            "probabilities": blended,
            "language_detected": detected_lang,
            "cleaned_text": cleaned,
            "lexicon_raw_score": lex_scores["raw_score"],
        }

    def predict_dataframe(self, df: pd.DataFrame, text_col: str = "cleaned_text") -> pd.DataFrame:
        """Annotate a DataFrame with predicted_sentiment and confidence columns."""
        if self.pipeline is None:
            raise RuntimeError("Sentiment pipeline is not loaded or trained.")

        out = df.copy()
        texts = out[text_col].fillna("").astype(str)
        probs = self.pipeline.predict_proba(texts)
        classes = list(self.pipeline.classes_)
        pred_indices = np.argmax(probs, axis=1)

        out["predicted_sentiment"] = [classes[i] for i in pred_indices]
        out["confidence"] = np.round(np.max(probs, axis=1), 4)
        return out
