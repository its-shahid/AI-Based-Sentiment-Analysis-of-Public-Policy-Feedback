"""
Model training, cross-model benchmarking, and evaluation reporting module.
Computes Accuracy, Precision, Recall, F1-score, per-class metrics, and Confusion Matrix.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

from .config import (
    EVAL_METRICS_PATH,
    MODELS_DIR,
    RANDOM_STATE,
    SENTIMENT_CLASSES,
    TEST_SIZE,
)
from .sentiment_model import PolicySentimentAnalyzer, get_candidate_models

logger = logging.getLogger(__name__)


def evaluate_and_select_best_model(
    df: pd.DataFrame,
    text_col: str = "cleaned_text",
    target_col: str = "sentiment",
    save_artifacts: bool = True,
) -> Tuple[PolicySentimentAnalyzer, Dict[str, Any]]:
    """
    Split dataset into stratified train/test sets, evaluate all candidate models,
    select the top performer by Macro F1-score, and persist metrics & model artifacts.
    """
    if text_col not in df.columns or target_col not in df.columns:
        raise ValueError(f"DataFrame must contain '{text_col}' and '{target_col}'.")

    X = df[text_col].astype(str)
    y = df[target_col].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    candidates = get_candidate_models()
    results: List[Dict[str, Any]] = []
    best_model_name = None
    best_f1 = -1.0
    best_pipeline = None

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    for name, pipeline in candidates.items():
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro")
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
        cm = confusion_matrix(y_test, y_pred, labels=SENTIMENT_CLASSES).tolist()
        report = classification_report(
            y_test,
            y_pred,
            labels=SENTIMENT_CLASSES,
            output_dict=True,
            zero_division=0,
        )

        # Normalize per-class dictionary
        per_class = {}
        for cls in SENTIMENT_CLASSES:
            cls_metrics = report.get(cls, {})
            per_class[cls] = {
                "precision": round(float(cls_metrics.get("precision", 0.0)), 4),
                "recall": round(float(cls_metrics.get("recall", 0.0)), 4),
                "f1_score": round(float(cls_metrics.get("f1-score", 0.0)), 4),
                "support": int(cls_metrics.get("support", 0)),
            }

        model_record = {
            "model_name": name,
            "accuracy": round(acc, 4),
            "precision_macro": round(prec, 4),
            "recall_macro": round(rec, 4),
            "f1_macro": round(f1, 4),
            "cv_f1_mean": round(float(np.mean(cv_scores)), 4),
            "cv_f1_std": round(float(np.std(cv_scores)), 4),
            "confusion_matrix": cm,
            "labels": SENTIMENT_CLASSES,
            "per_class": per_class,
        }
        results.append(model_record)

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_pipeline = pipeline

    results.sort(key=lambda r: r["f1_macro"], reverse=True)

    summary_payload = {
        "dataset_size": int(len(df)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "best_model": best_model_name,
        "models": results,
    }

    analyzer = PolicySentimentAnalyzer()
    analyzer.model_name = str(best_model_name)
    analyzer.pipeline = best_pipeline

    if save_artifacts:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        analyzer.save()
        with open(EVAL_METRICS_PATH, "w", encoding="utf-8") as fh:
            json.dump(summary_payload, fh, indent=2)
        logger.info("Saved evaluation metrics to %s", EVAL_METRICS_PATH)

    return analyzer, summary_payload


def compute_topic_relevance_metrics(
    topics: List[Dict[str, Any]],
    cleaned_texts: pd.Series,
) -> Dict[str, float]:
    """
    Evaluate extracted topic quality via:
    - Keyword Distinctiveness: fraction of unique keywords across all topics.
    - Co-occurrence Coherence: average PMI-normalized co-occurrence among top topic keywords.
    """
    if not topics:
        return {"topic_distinctiveness": 0.0, "coherence_score": 0.0, "coverage_percent": 0.0}

    all_keywords = [kw for t in topics for kw in t.get("keywords", [])]
    distinctiveness = len(set(all_keywords)) / max(1, len(all_keywords))

    doc_sets = [set(str(txt).split()) for txt in cleaned_texts.dropna()]
    n_docs = max(1, len(doc_sets))

    pair_scores: List[float] = []
    for t in topics:
        kws = list(t.get("keywords", []))[:5]
        for i in range(len(kws)):
            for j in range(i + 1, len(kws)):
                w1, w2 = kws[i], kws[j]
                c1 = sum(1 for d in doc_sets if w1 in d)
                c2 = sum(1 for d in doc_sets if w2 in d)
                c12 = sum(1 for d in doc_sets if w1 in d and w2 in d)
                if c1 > 0 and c2 > 0 and c12 > 0:
                    pmi = np.log((c12 * n_docs) / (c1 * c2))
                    npmi = pmi / max(1e-6, -np.log(c12 / n_docs))
                    pair_scores.append(float(npmi))

    total_assigned = sum(int(t.get("document_count", 0)) for t in topics)
    coverage = min(100.0, (total_assigned / n_docs) * 100.0)

    return {
        "topic_distinctiveness": round(float(distinctiveness), 4),
        "coherence_score": round(float(np.mean(pair_scores)) if pair_scores else 0.0, 4),
        "coverage_percent": round(float(coverage), 1),
    }


def load_saved_evaluation(path: Path = EVAL_METRICS_PATH) -> Dict[str, Any]:
    """Load persisted model benchmark metrics JSON if available."""
    if not path.exists():
        raise FileNotFoundError(f"Evaluation metrics not found at '{path}'.")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)
