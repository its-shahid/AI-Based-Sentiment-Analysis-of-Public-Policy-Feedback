"""
Multi-format data ingestion, smart column alias detection, and schema validation
for public policy feedback datasets (.csv, .xlsx, .xls, .json, .txt, .pdf).
"""

import io
import json
import logging
import re
from pathlib import Path
from typing import Dict, IO, List, Optional, Tuple, Union

import pandas as pd

from .config import DEFAULT_DATASET_PATH, OPTIONAL_TARGET_COLUMN, REQUIRED_COLUMNS
from .multilingual import detect_language_label

logger = logging.getLogger(__name__)


class DataIngestionError(Exception):
    """Raised when a feedback dataset cannot be loaded or fails validation."""


# Flexible column alias mappings so varied real-world exports work out of the box
COLUMN_ALIASES: Dict[str, List[str]] = {
    "feedback_text": [
        "feedback_text", "comment_text", "public_comment", "comment",
        "feedback", "text", "opinion", "review", "message", "response",
        "remarks", "suggestion", "body", "content", "description",
    ],
    "feedback_id": [
        "feedback_id", "id", "comment_id", "record_id", "sr_no", "sno", "ref_id",
    ],
    "submitted_date": [
        "submitted_date", "date", "created_at", "timestamp", "submission_date", "posted_at",
    ],
    "region": [
        "region", "state", "location", "city", "district", "area", "zone",
    ],
    "channel": [
        "channel", "source", "platform", "portal", "medium",
    ],
    "policy_name": [
        "policy_name", "policy", "scheme", "category", "topic", "department", "subject",
    ],
    "language": [
        "language", "lang", "locale",
    ],
    "sentiment": [
        "sentiment", "label", "polarity", "ground_truth",
    ],
}

POLICY_INFERENCE_KEYWORDS: List[Tuple[str, Tuple[str, ...]]] = [
    ("National Digital Health Mission", ("health", "hospital", "doctor", "clinic", "telemedicine", "अस्पताल", "स्वास्थ्य", "डॉक्टर")),
    ("Urban Clean Transit Subsidy", ("bus", "metro", "transit", "ev ", "electric vehicle", "commute", "transport", "बस", "मेट्रो", "परिवहन")),
    ("National Education Reform", ("school", "student", "teacher", "exam", "education", "scholarship", "स्कूल", "शिक्षा", "छात्र", "शिक्षक")),
    ("Rural Solar Microgrid Scheme", ("solar", "microgrid", "electricity", "blackout", "panel", "सोलर", "बिजली", "सौर")),
    ("Smart Water Metering Initiative", ("water", "meter", "pipeline", "leak", "billing", "पानी", "मीटर", "जल")),
    ("MSME Credit Guarantee Scheme", ("msme", "loan", "credit", "bank", "collateral", "entrepreneur", "ऋण", "बैंक", "उद्यमी")),
]


def _infer_policy_from_text(text: str) -> str:
    lowered = text.lower()
    for policy, keywords in POLICY_INFERENCE_KEYWORDS:
        if any(kw in lowered for kw in keywords):
            return policy
    return "General Public Policy"


def _resolve_column_aliases(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str], List[str]]:
    """Map recognized column aliases to canonical names and report inferred fields."""
    df = df.copy()
    normalized_cols = {str(c).strip().lower().replace(" ", "_"): c for c in df.columns}
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    detected_mapping: Dict[str, str] = {}
    rename_map: Dict[str, str] = {}

    for canonical, aliases in COLUMN_ALIASES.items():
        if canonical in df.columns:
            detected_mapping[canonical] = str(normalized_cols.get(canonical, canonical))
            continue
        for alias in aliases:
            if alias in df.columns:
                rename_map[alias] = canonical
                detected_mapping[canonical] = str(normalized_cols.get(alias, alias))
                break

    if rename_map:
        df = df.rename(columns=rename_map)

    if "feedback_text" not in df.columns:
        # Fallback: if there is a single dominant text column with long strings, suggest helpful error
        accepted = ", ".join(COLUMN_ALIASES["feedback_text"][:8])
        raise DataIngestionError(
            f"Could not detect a feedback text column. Found columns: {list(df.columns)}. "
            f"Rename your comment column to one of: {accepted}."
        )

    inferred_cols: List[str] = []
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            inferred_cols.append(col)

    return df, detected_mapping, inferred_cols


def _extract_comments_from_text_lines(raw_text: str) -> pd.DataFrame:
    """Split unstructured TXT or PDF page text into individual feedback comments."""
    lines = [re.sub(r"^\s*(?:\d+[.)]|[-*•])\s*", "", ln).strip() for ln in raw_text.splitlines()]
    # Filter out short header/footer noise like 'Page 1'
    comments: List[str] = []
    buffer: List[str] = []

    for ln in lines:
        if not ln or re.fullmatch(r"(?:page\s*)?\d+(?:\s*of\s*\d+)?", ln, re.IGNORECASE):
            if buffer:
                comments.append(" ".join(buffer).strip())
                buffer = []
            continue
        # Treat each substantial standalone line (>= 4 words or ending with punctuation) as a comment
        if len(ln.split()) >= 4 or ln.endswith((".", "!", "?", "।")):
            if buffer:
                comments.append(" ".join(buffer).strip())
                buffer = []
            comments.append(ln)
        else:
            buffer.append(ln)

    if buffer:
        comments.append(" ".join(buffer).strip())

    valid = [c for c in comments if len(c) >= 4]
    if not valid:
        raise DataIngestionError("No readable citizen feedback comments could be extracted from the document.")

    return pd.DataFrame({"feedback_text": valid})


def _read_raw_source(
    source: Union[str, Path, IO[bytes], IO[str]],
    filename: Optional[str] = None,
) -> Tuple[pd.DataFrame, str]:
    """Read CSV, Excel (.xlsx/.xls), JSON, TXT, or PDF into a raw DataFrame."""
    name = filename or (str(source) if isinstance(source, (str, Path)) else "uploaded_file.csv")
    ext = Path(name).suffix.lower() or ".csv"

    def _get_bytes() -> bytes:
        if isinstance(source, (str, Path)):
            return Path(source).read_bytes()
        if hasattr(source, "seek"):
            source.seek(0)
        data = source.read()
        return data.encode("utf-8") if isinstance(data, str) else data

    if ext == ".csv":
        encodings_to_try = ["utf-8-sig", "utf-8", "cp1252", "latin1"]
        last_error = None
        for enc in encodings_to_try:
            try:
                if hasattr(source, "seek"):
                    source.seek(0)
                return pd.read_csv(source, encoding=enc), "CSV"
            except UnicodeDecodeError as exc:
                last_error = exc
                continue
            except FileNotFoundError as exc:
                raise DataIngestionError(f"Dataset file not found at '{source}'.") from exc
            except pd.errors.EmptyDataError as exc:
                raise DataIngestionError("The provided CSV file is empty.") from exc
            except pd.errors.ParserError as exc:
                raise DataIngestionError(f"Malformed CSV syntax: {exc}") from exc
        raise DataIngestionError(f"Unable to decode CSV: {last_error}")

    if ext in {".xlsx", ".xls"}:
        try:
            raw_bytes = _get_bytes()
            excel_buf = io.BytesIO(raw_bytes)
            df = pd.read_excel(excel_buf, engine="openpyxl" if ext == ".xlsx" else None)
            return df, "Excel"
        except ImportError as exc:
            raise DataIngestionError(
                "Excel reading requires 'openpyxl' (for .xlsx) or 'xlrd' (for .xls). "
                "Run: pip install openpyxl xlrd"
            ) from exc
        except Exception as exc:
            raise DataIngestionError(f"Failed to read Excel file: {exc}") from exc

    if ext == ".json":
        try:
            raw_text = _get_bytes().decode("utf-8-sig")
            payload = json.loads(raw_text)
            if isinstance(payload, dict):
                for key in ("data", "records", "feedback", "comments", "items", "rows"):
                    if key in payload and isinstance(payload[key], list):
                        payload = payload[key]
                        break
                else:
                    payload = [payload]
            if isinstance(payload, list):
                if all(isinstance(item, str) for item in payload):
                    return pd.DataFrame({"feedback_text": payload}), "JSON"
                return pd.json_normalize(payload), "JSON"
            raise DataIngestionError("JSON must be an array of feedback objects or contain a 'data'/'comments' list.")
        except json.JSONDecodeError as exc:
            raise DataIngestionError(f"Invalid JSON syntax: {exc}") from exc

    if ext == ".txt":
        raw_bytes = _get_bytes()
        for enc in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
            try:
                return _extract_comments_from_text_lines(raw_bytes.decode(enc)), "TXT"
            except UnicodeDecodeError:
                continue
        raise DataIngestionError("Unable to decode TXT file.")

    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(_get_bytes()))
            pages_text = "\n".join((page.extract_text() or "") for page in reader.pages)
            if not pages_text.strip():
                raise DataIngestionError("The PDF appears to contain scanned images with no extractable text.")
            return _extract_comments_from_text_lines(pages_text), "PDF"
        except ImportError as exc:
            raise DataIngestionError("PDF ingestion requires 'pypdf'. Run: pip install pypdf") from exc
        except DataIngestionError:
            raise
        except Exception as exc:
            raise DataIngestionError(f"Failed to extract text from PDF: {exc}") from exc

    raise DataIngestionError(
        f"Unsupported file format '{ext}'. Supported formats: .csv, .xlsx, .xls, .json, .txt, .pdf"
    )


def load_feedback_file(
    source: Union[str, Path, IO[bytes], IO[str]],
    filename: Optional[str] = None,
    require_target: bool = False,
) -> pd.DataFrame:
    """
    Load and validate public policy feedback from CSV, Excel, JSON, TXT, or PDF.
    Preserves all valid non-empty rows without truncation or text deduplication.
    """
    raw_df, file_type = _read_raw_source(source, filename=filename)
    return validate_and_normalize_dataframe(
        raw_df,
        require_target=require_target,
        source_name=filename or str(source),
        file_type=file_type,
    )


def load_feedback_csv(
    source: Union[str, Path, IO[bytes], IO[str]],
    require_target: bool = False,
) -> pd.DataFrame:
    """Backwards-compatible wrapper for CSV ingestion."""
    return load_feedback_file(source, filename="dataset.csv" if not isinstance(source, (str, Path)) else None, require_target=require_target)


def validate_and_normalize_dataframe(
    df: pd.DataFrame,
    require_target: bool = False,
    source_name: str = "dataset.csv",
    file_type: str = "CSV",
) -> pd.DataFrame:
    """Validate/infer required columns, drop only blank texts, and standardize types."""
    if df.empty:
        raise DataIngestionError("Dataset contains zero rows.")

    df, detected_mapping, inferred_cols = _resolve_column_aliases(df)

    if require_target and OPTIONAL_TARGET_COLUMN not in df.columns:
        raise DataIngestionError(
            f"Ground-truth column '{OPTIONAL_TARGET_COLUMN}' is required for model training/evaluation."
        )

    # Keep all non-empty feedback rows (do not drop repeated feedback across citizens/regions)
    df["feedback_text"] = df["feedback_text"].fillna("").astype(str).str.strip()
    initial_count = len(df)
    df = df[df["feedback_text"].str.len() > 0].copy().reset_index(drop=True)
    dropped = initial_count - len(df)
    if dropped > 0:
        logger.warning("Dropped %d blank feedback rows.", dropped)

    if df.empty:
        raise DataIngestionError("No valid non-empty feedback rows remain after filtering.")

    # Auto-generate or normalize optional metadata columns cleanly
    if "feedback_id" not in df.columns:
        df["feedback_id"] = [f"FB-{i + 1:04d}" for i in range(len(df))]
    else:
        df["feedback_id"] = df["feedback_id"].fillna("").astype(str).str.strip()
        empty_ids = df["feedback_id"] == ""
        if empty_ids.any():
            df.loc[empty_ids, "feedback_id"] = [f"FB-{i + 1:04d}" for i in df.index[empty_ids]]

    if "submitted_date" not in df.columns:
        df["submitted_date"] = pd.Timestamp.today().normalize()
    else:
        df["submitted_date"] = pd.to_datetime(df["submitted_date"], errors="coerce")
        if df["submitted_date"].isna().all():
            df["submitted_date"] = pd.Timestamp.today().normalize()
        else:
            df["submitted_date"] = df["submitted_date"].fillna(df["submitted_date"].median())

    df["month"] = df["submitted_date"].dt.to_period("M").astype(str)

    if "policy_name" not in df.columns:
        df["policy_name"] = df["feedback_text"].apply(_infer_policy_from_text)
    else:
        df["policy_name"] = df["policy_name"].fillna("General Public Policy").astype(str).str.strip()
        df.loc[df["policy_name"] == "", "policy_name"] = "General Public Policy"

    if "region" not in df.columns:
        df["region"] = "National"
    else:
        df["region"] = df["region"].fillna("National").astype(str).str.strip()
        df.loc[df["region"] == "", "region"] = "National"

    if "channel" not in df.columns:
        df["channel"] = f"{file_type} Upload"
    else:
        df["channel"] = df["channel"].fillna(f"{file_type} Upload").astype(str).str.strip()
        df.loc[df["channel"] == "", "channel"] = f"{file_type} Upload"

    if "language" not in df.columns:
        df["language"] = df["feedback_text"].apply(detect_language_label)
    else:
        df["language"] = df["language"].fillna("").astype(str).str.strip()
        missing_lang = df["language"] == ""
        if missing_lang.any():
            df.loc[missing_lang, "language"] = df.loc[missing_lang, "feedback_text"].apply(detect_language_label)

    if OPTIONAL_TARGET_COLUMN in df.columns:
        df[OPTIONAL_TARGET_COLUMN] = (
            df[OPTIONAL_TARGET_COLUMN]
            .fillna("Neutral")
            .astype(str)
            .str.strip()
            .str.title()
        )

    df.attrs["file_name"] = Path(source_name).name
    df.attrs["file_type"] = file_type
    df.attrs["raw_row_count"] = int(initial_count)
    df.attrs["loaded_row_count"] = int(len(df))
    df.attrs["dropped_empty_count"] = int(dropped)
    df.attrs["detected_columns"] = detected_mapping
    df.attrs["inferred_columns"] = inferred_cols

    return df


def get_dataset_summary(df: pd.DataFrame) -> Tuple[int, int, int]:
    """Return (total_rows, unique_policies, unique_languages)."""
    return (
        len(df),
        df["policy_name"].nunique(),
        df["language"].nunique(),
    )


def load_default_dataset(require_target: bool = False) -> pd.DataFrame:
    """Convenience loader for the bundled public_policy_feedback.csv dataset."""
    return load_feedback_file(DEFAULT_DATASET_PATH, filename=DEFAULT_DATASET_PATH.name, require_target=require_target)
