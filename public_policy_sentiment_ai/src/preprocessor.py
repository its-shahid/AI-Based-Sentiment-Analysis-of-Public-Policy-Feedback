"""
Bilingual NLP text preprocessing for English and Hindi (Devanagari + Romanized Hinglish).
Handles Unicode normalization, URL/noise removal, tokenization, and stopword filtering.
"""

import re
import unicodedata
from typing import List
import pandas as pd

from .config import ALL_STOPWORDS

URL_PATTERN = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
MENTION_HASHTAG_PATTERN = re.compile(r"[@#]\w+")
DIGIT_PATTERN = re.compile(r"\d+")
WHITESPACE_PATTERN = re.compile(r"\s+")
# Keep English letters and Devanagari block (\u0900-\u097F) + spaces
NON_TEXT_PATTERN = re.compile(r"[^\w\s\u0900-\u097F]", re.UNICODE)


def clean_text(text: str, remove_stopwords: bool = True) -> str:
    """
    Normalize and clean bilingual English/Hindi citizen feedback text.

    Preserves Devanagari matras (vowel signs) via NFC normalization while
    stripping URLs, HTML entities, punctuation, and noise.
    """
    if not isinstance(text, str):
        return ""

    # Normalize Devanagari & Latin Unicode characters safely
    normalized = unicodedata.normalize("NFC", text.strip())
    normalized = URL_PATTERN.sub(" ", normalized)
    normalized = MENTION_HASHTAG_PATTERN.sub(" ", normalized)
    normalized = DIGIT_PATTERN.sub(" ", normalized)
    normalized = normalized.lower()

    # Replace punctuation with spaces while preserving Devanagari combining marks
    cleaned_chars = []
    for ch in normalized:
        cat = unicodedata.category(ch)
        if ch.isspace() or ("\u0900" <= ch <= "\u097F") or ("a" <= ch <= "z"):
            cleaned_chars.append(ch)
        elif cat.startswith("M") and cleaned_chars and ("\u0900" <= cleaned_chars[-1] <= "\u097F"):
            cleaned_chars.append(ch)
        else:
            cleaned_chars.append(" ")

    cleaned = WHITESPACE_PATTERN.sub(" ", "".join(cleaned_chars)).strip()

    if not remove_stopwords:
        return cleaned

    tokens = [
        tok for tok in cleaned.split()
        if len(tok) > 1 and tok not in ALL_STOPWORDS
    ]
    return " ".join(tokens)


def tokenize_bilingual(text: str, remove_stopwords: bool = True) -> List[str]:
    """Return a list of normalized tokens for English/Hindi text."""
    cleaned = clean_text(text, remove_stopwords=remove_stopwords)
    return cleaned.split() if cleaned else []


def split_sentences(text: str) -> List[str]:
    """Split English and Hindi text on '.', '!', '?', and Devanagari danda '।'."""
    if not isinstance(text, str) or not text.strip():
        return []
    parts = re.split(r"[.!?।]+", text)
    return [p.strip() for p in parts if len(p.strip()) > 6]


def preprocess_dataframe(df: pd.DataFrame, text_column: str = "feedback_text") -> pd.DataFrame:
    """Add 'cleaned_text' and 'token_count' columns to a validated DataFrame."""
    if text_column not in df.columns:
        raise ValueError(f"Column '{text_column}' not found in DataFrame.")

    out = df.copy()
    out["cleaned_text"] = out[text_column].apply(lambda x: clean_text(x, remove_stopwords=True))
    # Fallback to non-stopword-removed text if stopword stripping emptied a very short comment
    empty_mask = out["cleaned_text"].str.len() == 0
    if empty_mask.any():
        out.loc[empty_mask, "cleaned_text"] = out.loc[empty_mask, text_column].apply(
            lambda x: clean_text(x, remove_stopwords=False)
        )
    out["token_count"] = out["cleaned_text"].apply(lambda x: len(x.split()))
    return out
