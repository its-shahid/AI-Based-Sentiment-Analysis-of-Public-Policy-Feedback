"""
Multilingual support module for English, Hindi (Devanagari), and Hinglish.
Provides deterministic script-ratio language detection, bilingual lexicon scoring,
and optional translation bridge with graceful offline fallback.
"""

import logging
import re
from typing import Dict, Tuple

from .config import BILINGUAL_LEXICON

logger = logging.getLogger(__name__)

DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")
HINGLISH_MARKERS = {
    "hai", "hain", "nahi", "nahin", "bahut", "accha", "achha", "kharab",
    "yojana", "sarkar", "pareshani", "suvidha", "madad", "samasya", "bekar",
    "badhiya", "mehanga", "deri", "kripya", "sabhi", "lekin", "kyunki",
}

# Key Hindi-to-English policy glosses for offline cross-lingual summaries & topic readability
HINDI_TO_ENGLISH_GLOSS: Dict[str, str] = {
    "भ्रष्टाचार": "corruption",
    "देरी": "delay",
    "पारदर्शी": "transparent",
    "लाभदायक": "beneficial",
    "सुविधा": "facility",
    "समस्या": "problem",
    "परेशानी": "harassment/trouble",
    "महंगा": "expensive",
    "सस्ता": "affordable",
    "सुधार": "improvement",
    "अस्पताल": "hospital",
    "शिक्षा": "education",
    "बिजली": "electricity",
    "पानी": "water",
    "परिवहन": "transit",
    "ऋण": "loan/credit",
    "सब्सिडी": "subsidy",
    "ऑनलाइन": "online",
    "पोर्टल": "portal",
    "ग्रामीण": "rural",
    "शहरी": "urban",
}


def detect_language_label(text: str) -> str:
    """
    Detect whether input feedback is 'Hindi', 'Hinglish', or 'English'.
    Uses Unicode Devanagari script detection first (100% deterministic offline),
    then checks Romanized Hinglish vocabulary, and optionally langdetect.
    """
    if not isinstance(text, str) or not text.strip():
        return "English"

    devanagari_chars = len(DEVANAGARI_PATTERN.findall(text))
    alpha_chars = len(re.findall(r"[A-Za-z\u0900-\u097F]", text))

    if alpha_chars > 0 and (devanagari_chars / alpha_chars) >= 0.25:
        return "Hindi"

    words = set(re.findall(r"[a-z]+", text.lower()))
    hinglish_hits = len(words & HINGLISH_MARKERS)
    if hinglish_hits >= 2:
        return "Hindi (Hinglish)"

    # Optional langdetect fallback for edge cases
    try:
        from langdetect import detect
        detected = detect(text)
        if detected == "hi":
            return "Hindi"
    except Exception:
        pass

    return "English"


def translate_to_english(text: str, source_lang: str = "hi") -> Tuple[str, bool]:
    """
    Translate Hindi feedback to English via deep-translator if online.
    Gracefully falls back to offline gloss-assisted text if offline/unavailable.

    Returns (translated_text, used_live_translator).
    """
    if not text or not text.strip():
        return text, False

    if source_lang.lower().startswith("en"):
        return text, False

    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source="auto", target="en").translate(text)
        if translated:
            return translated, True
    except Exception as exc:
        logger.debug("Live translation unavailable, using offline gloss fallback: %s", exc)

    # Offline gloss enrichment so bilingual topic modeling/keywords stay interpretable
    enriched_tokens = []
    for token in text.split():
        gloss = HINDI_TO_ENGLISH_GLOSS.get(token.strip(".,!?।"))
        enriched_tokens.append(f"{token} ({gloss})" if gloss else token)
    return " ".join(enriched_tokens), False


def compute_lexicon_polarity(text: str) -> Dict[str, float]:
    """
    Score English, Hindi Devanagari, and Hinglish text using the bilingual lexicon.
    Returns normalized probabilities for Negative, Neutral, and Positive plus raw score.
    """
    if not isinstance(text, str) or not text.strip():
        return {"Negative": 0.2, "Neutral": 0.6, "Positive": 0.2, "raw_score": 0.0}

    lowered = text.lower()
    tokens = re.findall(r"[a-z\u0900-\u097F]+", lowered)

    negations = {"not", "no", "never", "neither", "नहीं", "ना", "बिना", "nahi", "nahin"}
    score = 0.0
    hits = 0

    for idx, tok in enumerate(tokens):
        val = BILINGUAL_LEXICON.get(tok, 0.0)
        if val != 0.0:
            # Check immediate preceding negation window (2 tokens)
            window = tokens[max(0, idx - 2):idx]
            if any(w in negations for w in window):
                val = -0.8 * val
            score += val
            hits += 1

    # Handle multi-word Hinglish phrases
    for phrase, val in BILINGUAL_LEXICON.items():
        if " " in phrase and phrase in lowered:
            score += val
            hits += 1

    if hits == 0 or abs(score) < 0.35:
        return {"Negative": 0.18, "Neutral": 0.64, "Positive": 0.18, "raw_score": round(score, 3)}

    if score > 0:
        pos_p = min(0.92, 0.52 + 0.12 * score)
        neg_p = max(0.03, (1.0 - pos_p) * 0.25)
        neu_p = max(0.05, 1.0 - pos_p - neg_p)
    else:
        neg_p = min(0.92, 0.52 + 0.12 * abs(score))
        pos_p = max(0.03, (1.0 - neg_p) * 0.25)
        neu_p = max(0.05, 1.0 - neg_p - pos_p)

    return {
        "Negative": round(neg_p, 4),
        "Neutral": round(neu_p, 4),
        "Positive": round(pos_p, 4),
        "raw_score": round(score, 3),
    }
