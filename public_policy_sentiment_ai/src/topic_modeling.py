"""
Topic modeling module using Latent Dirichlet Allocation (LDA) and Non-negative
Matrix Factorization (NMF) to extract citizen concerns and policy suggestions.
"""

from typing import Dict, List
import pandas as pd
from sklearn.decomposition import LatentDirichletAllocation, NMF
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

from .config import DEFAULT_NUM_TOPICS, RANDOM_STATE


def extract_topics(
    texts: pd.Series,
    num_topics: int = DEFAULT_NUM_TOPICS,
    method: str = "NMF",
    top_n_words: int = 7,
) -> List[Dict[str, object]]:
    """
    Discover latent themes from preprocessed feedback texts.

    Parameters
    ----------
    texts : pd.Series
        Series of cleaned feedback strings.
    num_topics : int
        Number of topics to extract (automatically clamped for small datasets).
    method : str
        'NMF' (default, crisp sparse topics) or 'LDA'.
    top_n_words : int
        Number of representative keywords per topic.
    """
    valid_texts = [str(t).strip() for t in texts.dropna() if len(str(t).strip()) > 2]
    if len(valid_texts) < 6:
        return []

    effective_topics = max(2, min(num_topics, len(valid_texts) // 3))

    if method.upper() == "LDA":
        vectorizer = CountVectorizer(
            max_features=1500,
            min_df=2,
            max_df=0.85,
            token_pattern=r"(?u)\b[\w\u0900-\u097F]{2,}\b",
        )
        doc_term = vectorizer.fit_transform(valid_texts)
        if doc_term.shape[1] < effective_topics:
            return []
        model = LatentDirichletAllocation(
            n_components=effective_topics,
            random_state=RANDOM_STATE,
            learning_method="online",
            max_iter=15,
        )
    else:
        vectorizer = TfidfVectorizer(
            max_features=1500,
            min_df=2,
            max_df=0.85,
            ngram_range=(1, 2),
            token_pattern=r"(?u)\b[\w\u0900-\u097F]{2,}\b",
        )
        doc_term = vectorizer.fit_transform(valid_texts)
        if doc_term.shape[1] < effective_topics:
            return []
        model = NMF(
            n_components=effective_topics,
            random_state=RANDOM_STATE,
            init="nndsvda",
            max_iter=300,
        )

    doc_topic_matrix = model.fit_transform(doc_term)
    feature_names = vectorizer.get_feature_names_out()
    dominant_topics = doc_topic_matrix.argmax(axis=1)

    topics_output: List[Dict[str, object]] = []
    for topic_idx, component in enumerate(model.components_):
        top_indices = component.argsort()[: -top_n_words - 1 : -1]
        keywords = [str(feature_names[i]) for i in top_indices]
        doc_count = int((dominant_topics == topic_idx).sum())
        share_pct = round((doc_count / len(valid_texts)) * 100.0, 1)
        topics_output.append({
            "topic_id": topic_idx + 1,
            "label": " / ".join(keywords[:3]).title(),
            "keywords": keywords,
            "document_count": doc_count,
            "share_percent": share_pct,
        })

    topics_output.sort(key=lambda x: x["document_count"], reverse=True)
    return topics_output


def extract_concerns_and_suggestions(df: pd.DataFrame) -> Dict[str, List[Dict[str, object]]]:
    """
    Separate Negative feedback for Common Concerns and Neutral/Suggestion-bearing
    feedback for Citizen Suggestions.
    """
    sentiment_col = "predicted_sentiment" if "predicted_sentiment" in df.columns else "sentiment"
    text_col = "cleaned_text" if "cleaned_text" in df.columns else "feedback_text"

    neg_df = df[df[sentiment_col] == "Negative"]
    neu_df = df[df[sentiment_col] == "Neutral"]
    pos_df = df[df[sentiment_col] == "Positive"]

    return {
        "common_concerns": extract_topics(neg_df[text_col], num_topics=4, method="NMF"),
        "citizen_suggestions": extract_topics(neu_df[text_col], num_topics=3, method="NMF"),
        "praised_aspects": extract_topics(pos_df[text_col], num_topics=3, method="NMF"),
    }
