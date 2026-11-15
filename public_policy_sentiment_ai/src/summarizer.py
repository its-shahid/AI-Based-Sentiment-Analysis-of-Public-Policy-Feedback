"""
Automatic extractive opinion summarization using TF-IDF sentence salience
and TextRank graph centrality across English and Hindi public feedback.
"""

from typing import Dict, List
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .config import DEFAULT_SUMMARY_SENTENCES
from .preprocessor import split_sentences


def summarize_texts(
    texts: List[str],
    num_sentences: int = DEFAULT_SUMMARY_SENTENCES,
) -> List[str]:
    """
    Generate an extractive summary of key public opinions using TextRank
    (PageRank over sentence TF-IDF cosine similarity matrix).
    """
    sentences: List[str] = []
    seen = set()
    for text in texts:
        for sent in split_sentences(str(text)):
            norm = sent.lower().strip()
            if norm not in seen and len(sent.split()) >= 5:
                seen.add(norm)
                sentences.append(sent)

    if not sentences:
        return []
    if len(sentences) <= num_sentences:
        return sentences

    candidates = sentences
    vectorizer = TfidfVectorizer(
        max_features=2000,
        token_pattern=r"(?u)\b[\w\u0900-\u097F]{2,}\b",
    )
    tfidf_matrix = vectorizer.fit_transform(candidates)
    sim_matrix = cosine_similarity(tfidf_matrix)
    np.fill_diagonal(sim_matrix, 0.0)

    # Power-iteration TextRank scoring
    n = len(candidates)
    scores = np.ones(n) / n
    damping = 0.85
    row_sums = sim_matrix.sum(axis=1, keepdims=True)
    transition = np.divide(sim_matrix, row_sums, out=np.zeros_like(sim_matrix), where=row_sums != 0)

    for _ in range(25):
        scores = (1.0 - damping) / n + damping * transition.T.dot(scores)

    top_indices = np.argsort(scores)[::-1][:num_sentences]
    # Preserve logical ordering
    selected = [candidates[i] for i in sorted(top_indices)]
    return selected


def generate_policy_executive_summary(df: pd.DataFrame, policy_name: str = "All Policies") -> Dict[str, object]:
    """
    Produce a structured public opinion brief containing sentiment percentages,
    top praised takeaways, top citizen concerns, and actionable suggestions.
    """
    sentiment_col = "predicted_sentiment" if "predicted_sentiment" in df.columns else "sentiment"

    subset = df if policy_name == "All Policies" else df[df["policy_name"] == policy_name]
    total = len(subset)
    if total == 0:
        return {
            "policy_name": policy_name,
            "total_responses": 0,
            "sentiment_breakdown": {"Positive": 0.0, "Neutral": 0.0, "Negative": 0.0},
            "positive_highlights": [],
            "concern_highlights": [],
            "suggestion_highlights": [],
        }

    counts = subset[sentiment_col].value_counts()
    breakdown = {
        "Positive": round((counts.get("Positive", 0) / total) * 100.0, 1),
        "Neutral": round((counts.get("Neutral", 0) / total) * 100.0, 1),
        "Negative": round((counts.get("Negative", 0) / total) * 100.0, 1),
    }

    pos_texts = subset[subset[sentiment_col] == "Positive"]["feedback_text"].tolist()
    neg_texts = subset[subset[sentiment_col] == "Negative"]["feedback_text"].tolist()
    neu_texts = subset[subset[sentiment_col] == "Neutral"]["feedback_text"].tolist()

    return {
        "policy_name": policy_name,
        "total_responses": int(total),
        "sentiment_breakdown": breakdown,
        "positive_highlights": summarize_texts(pos_texts, num_sentences=3),
        "concern_highlights": summarize_texts(neg_texts, num_sentences=3),
        "suggestion_highlights": summarize_texts(neu_texts, num_sentences=3),
    }
