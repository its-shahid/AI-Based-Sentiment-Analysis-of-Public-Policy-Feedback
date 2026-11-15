"""
Centralized configuration, paths, hyperparameters, and bilingual linguistic resources
for the Public Policy Sentiment Analysis system.
"""

from pathlib import Path
from typing import Dict, List, Set

# Directory Paths (cross-platform Pathlib for Windows/Linux/macOS)
BASE_DIR: Path = Path(__file__).resolve().parent.parent
DATA_DIR: Path = BASE_DIR / "data"
MODELS_DIR: Path = BASE_DIR / "models"
DOCS_DIR: Path = BASE_DIR / "docs"

DEFAULT_DATASET_PATH: Path = DATA_DIR / "public_policy_feedback.csv"
BEST_MODEL_PATH: Path = MODELS_DIR / "best_sentiment_pipeline.joblib"
EVAL_METRICS_PATH: Path = MODELS_DIR / "evaluation_metrics.json"

# Required CSV Schema
REQUIRED_COLUMNS: List[str] = [
    "feedback_id",
    "submitted_date",
    "policy_name",
    "region",
    "channel",
    "language",
    "feedback_text",
]

OPTIONAL_TARGET_COLUMN: str = "sentiment"
SENTIMENT_CLASSES: List[str] = ["Negative", "Neutral", "Positive"]

# Supported Public Policies
POLICY_CATEGORIES: List[str] = [
    "National Digital Health Mission",
    "Urban Clean Transit Subsidy",
    "National Education Reform",
    "Rural Solar Microgrid Scheme",
    "Smart Water Metering Initiative",
    "MSME Credit Guarantee Scheme",
]

# ML Training Hyperparameters
RANDOM_STATE: int = 42
TEST_SIZE: float = 0.20
TFIDF_MAX_FEATURES: int = 4500
TFIDF_NGRAM_RANGE = (1, 2)
DEFAULT_NUM_TOPICS: int = 5
DEFAULT_SUMMARY_SENTENCES: int = 3

# English Stopwords (self-contained so offline environments work without NLTK downloads)
ENGLISH_STOPWORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "couldn't", "did", "didn't",
    "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few",
    "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't",
    "having", "he", "her", "here", "hers", "herself", "him", "himself", "his",
    "how", "i", "if", "in", "into", "is", "isn't", "it", "its", "itself", "just",
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "now",
    "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves",
    "out", "over", "own", "same", "she", "should", "shouldn't", "so", "some",
    "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then",
    "there", "these", "they", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what",
    "when", "where", "which", "while", "who", "whom", "why", "will", "with",
    "won't", "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves",
    "policy", "scheme", "government", "citizens", "public", "people", "please",
}

# Hindi Stopwords (Devanagari + common Romanized Hinglish stopwords)
HINDI_STOPWORDS: Set[str] = {
    "अंदर", "अत", "अपना", "अपनी", "अपने", "अभी", "आदि", "आप", "इत्यादि", "इन", "इनका",
    "इन्हीं", "इन्हें", "इस", "इसका", "इसकी", "इसके", "इसमें", "इसी", "इसे", "उन",
    "उनका", "उनकी", "उनके", "उनको", "उन्हें", "उस", "उसका", "उसकी", "उसके", "उसको",
    "उसी", "उसे", "एक", "एवं", "एस", "ऐसे", "और", "कई", "कर", "करता", "करते", "करना",
    "करने", "करें", "कहते", "कहा", "का", "काफी", "कि", "कितना", "किन्हें", "किया", "की",
    "कुछ", "कुल", "के", "को", "कोई", "कौन", "क्या", "क्यों", "गया", "गये", "गयी",
    "गई", "जब", "जहाँ", "जा", "जाता", "जाते", "जाना", "जाने", "जिन्हें", "जिस", "जिसे",
    "जैसा", "जैसे", "जो", "तक", "तथा", "तब", "तरह", "तो", "था", "थी", "थे", "दिया",
    "द्वारा", "न", "नहीं", "ना", "ने", "पर", "परंतु", "पहले", "पूरा", "पे", "फिर",
    "बनी", "बहुत", "बाद", "भी", "मगर", "में", "मेरा", "मेरी", "मेरे", "मैं", "यह",
    "यहाँ", "यही", "या", "ये", "रहा", "रहे", "रही", "रखें", "लिया", "लिए", "लेकिन",
    "व", "वहाँ", "वह", "वही", "वाले", "सकता", "सकते", "सबसे", "सभी", "साथ", "साफ",
    "से", "हैं", "है", "हूं", "हूँ", "हो", "होगा", "होगी", "होते", "होता", "होना", "होने",
    "सरकार", "योजना", "नीति", "नागरिक", "लोग", "कृपया",
    # Romanized Hinglish stopwords
    "hai", "hain", "ko", "ka", "ki", "ke", "mein", "me", "se", "aur", "par",
    "ye", "yeh", "woh", "kya", "bhi", "toh", "hi", "hum", "aap", "yojana", "sarkar",
}

ALL_STOPWORDS: Set[str] = ENGLISH_STOPWORDS | HINDI_STOPWORDS

# Bilingual Sentiment Lexicon (helps boost accuracy on Hindi Devanagari & Hinglish)
BILINGUAL_LEXICON: Dict[str, float] = {
    # English Positive
    "excellent": 2.0, "effective": 1.6, "transparent": 1.7, "beneficial": 1.8,
    "helpful": 1.5, "fast": 1.3, "improved": 1.6, "reliable": 1.6, "affordable": 1.6,
    "accessible": 1.5, "seamless": 1.7, "timely": 1.4, "welcome": 1.3, "praise": 1.6,
    "great": 1.6, "good": 1.2, "supportive": 1.4, "clean": 1.3, "reduced": 1.0,
    "empowered": 1.7, "sustainable": 1.5, "modern": 1.3, "efficient": 1.6,
    # English Negative
    "broken": -1.8, "delayed": -1.6, "delay": -1.5, "corrupt": -2.0, "corruption": -2.0,
    "expensive": -1.5, "unfair": -1.7, "poor": -1.6, "failed": -1.9, "failure": -1.9,
    "confusing": -1.3, "overpriced": -1.7, "unreliable": -1.8, "harassment": -2.0,
    "inaccessible": -1.7, "shortage": -1.5, "rejected": -1.4, "worst": -2.0,
    "inefficient": -1.6, "burden": -1.5, "ignored": -1.6, "slow": -1.3, "faulty": -1.6,
    # Hindi Devanagari Positive
    "उत्कृष्ट": 2.0, "अच्छा": 1.4, "अच्छी": 1.4, "अच्छे": 1.4, "बेहतर": 1.6,
    "लाभदायक": 1.8, "मददगार": 1.6, "सुगम": 1.6, "पारदर्शी": 1.8, "त्वरित": 1.5,
    "सराहनीय": 1.8, "सफल": 1.7, "सस्ता": 1.4, "सस्ती": 1.4, "सुविधाजनक": 1.6,
    "सुधार": 1.4, "स्वच्छ": 1.4, "सशक्त": 1.6, "उम्मीद": 1.1, "खुश": 1.5,
    "प्रभावी": 1.6, "तेज": 1.3, "तेज़": 1.3, "सही": 1.2, "स्वागत": 1.4,
    # Hindi Devanagari Negative
    "खराब": -1.7, "ख़राब": -1.7, "देरी": -1.6, "भ्रष्टाचार": -2.0, "महंगा": -1.5,
    "महंगी": -1.5, "महँगा": -1.5, "असफल": -1.9, "कठिन": -1.4, "समस्या": -1.3,
    "परेशानी": -1.6, "बेकार": -1.9, "धीमा": -1.4, "धीमी": -1.4, "अनियमित": -1.6,
    "कमी": -1.4, "गलत": -1.5, "नुकसान": -1.6, "जटिल": -1.3, "लापरवाही": -1.8,
    "विफल": -1.9, "निराशाजनक": -1.8, "बोझ": -1.5, "अन्याय": -1.8,
    # Romanized Hinglish
    "accha": 1.3, "achha": 1.3, "badhiya": 1.6, "badiya": 1.6, "bahut accha": 1.8,
    "sahi": 1.2, "madad": 1.2, "bekar": -1.8, "kharab": -1.7, "ganda": -1.6,
    "mehanga": -1.5, "mushkil": -1.4, "pareshani": -1.5, "deri": -1.5,
}
