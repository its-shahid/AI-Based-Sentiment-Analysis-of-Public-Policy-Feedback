"""
Data ingestion and schema validation utilities for CSV public policy feedback datasets.
Includes defensive error handling for encoding, malformed rows, and missing columns.
"""

import logging
from pathlib import Path
from typing import Tuple, Union, IO
import pandas as pd

from .config import DEFAULT_DATASET_PATH, REQUIRED_COLUMNS, OPTIONAL_TARGET_COLUMN

logger = logging.getLogger(__name__)


class DataIngestionError(Exception):
    """Raised when a feedback dataset cannot be loaded or fails schema validation."""


def load_feedback_csv(
    source: Union[str, Path, IO[bytes], IO[str]],
    require_target: bool = False,
) -> pd.DataFrame:
    """
    Load a public policy feedback CSV from disk or an uploaded file-like stream.

    Parameters
    ----------
    source : str | Path | IO
        File path or Streamlit UploadedFile buffer.
    require_target : bool
        If True, ensures the ground-truth 'sentiment' column exists.

    Returns
    -------
    pd.DataFrame
        Cleaned and validated DataFrame ready for NLP preprocessing.
    """
    encodings_to_try = ["utf-8-sig", "utf-8", "cp1252", "latin1"]
    df = None
    last_error = None

    for enc in encodings_to_try:
        try:
            if hasattr(source, "seek"):
                source.seek(0)
            df = pd.read_csv(source, encoding=enc)
            break
        except UnicodeDecodeError as exc:
            last_error = exc
            continue
        except FileNotFoundError as exc:
            raise DataIngestionError(
                f"Dataset file not found at '{source}'. "
                "Run 'python data/generate_dataset.py' to create the sample dataset."
            ) from exc
        except pd.errors.EmptyDataError as exc:
            raise DataIngestionError("The provided CSV file is empty.") from exc
        except pd.errors.ParserError as exc:
            raise DataIngestionError(f"Malformed CSV syntax: {exc}") from exc
        except Exception as exc:
            raise DataIngestionError(f"Unexpected error reading CSV: {exc}") from exc

    if df is None:
        raise DataIngestionError(
            f"Unable to decode CSV using UTF-8 or Windows encodings: {last_error}"
        )

    return validate_and_normalize_dataframe(df, require_target=require_target)


def validate_and_normalize_dataframe(
    df: pd.DataFrame,
    require_target: bool = False,
) -> pd.DataFrame:
    """Validate required columns, drop empty texts, and standardize types."""
    if df.empty:
        raise DataIngestionError("Dataset contains zero rows.")

    # Normalize column headers (strip whitespace, lowercase)
    df = df.copy()
    df.columns = [str(col).strip().lower() for col in df.columns]

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise DataIngestionError(
            f"Missing required column(s): {', '.join(missing)}. "
            f"Expected columns: {', '.join(REQUIRED_COLUMNS)}"
        )

    if require_target and OPTIONAL_TARGET_COLUMN not in df.columns:
        raise DataIngestionError(
            f"Ground-truth column '{OPTIONAL_TARGET_COLUMN}' is required for model training/evaluation."
        )

    # Clean missing or blank feedback texts (keep all non-empty rows, including repeated comments across citizens/regions)
    df["feedback_text"] = df["feedback_text"].fillna("").astype(str).str.strip()
    initial_count = len(df)
    df = df[df["feedback_text"].str.len() > 0].copy().reset_index(drop=True)
    dropped = initial_count - len(df)
    if dropped > 0:
        logger.warning("Dropped %d blank feedback rows.", dropped)

    if df.empty:
        raise DataIngestionError("No valid non-empty feedback rows remain after filtering.")

    # Preserve all valid rows without truncating or dropping repeated feedback_text values
    df["feedback_id"] = df["feedback_id"].fillna("").astype(str).str.strip()
    empty_ids = df["feedback_id"] == ""
    if empty_ids.any():
        df.loc[empty_ids, "feedback_id"] = [f"FB-{i + 1:04d}" for i in df.index[empty_ids]]

    # Parse dates safely
    df["submitted_date"] = pd.to_datetime(df["submitted_date"], errors="coerce")
    if df["submitted_date"].isna().all():
        df["submitted_date"] = pd.Timestamp.today().normalize()
    else:
        df["submitted_date"] = df["submitted_date"].fillna(df["submitted_date"].median())

    df["month"] = df["submitted_date"].dt.to_period("M").astype(str)
    df["policy_name"] = df["policy_name"].fillna("General Policy").astype(str).str.strip()
    df["region"] = df["region"].fillna("National").astype(str).str.strip()
    df["channel"] = df["channel"].fillna("Web Portal").astype(str).str.strip()
    df["language"] = df["language"].fillna("Unknown").astype(str).str.strip()

    if OPTIONAL_TARGET_COLUMN in df.columns:
        df[OPTIONAL_TARGET_COLUMN] = (
            df[OPTIONAL_TARGET_COLUMN]
            .fillna("Neutral")
            .astype(str)
            .str.strip()
            .str.title()
        )

    df.attrs["raw_row_count"] = int(initial_count)
    df.attrs["loaded_row_count"] = int(len(df))
    df.attrs["dropped_empty_count"] = int(dropped)

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
    return load_feedback_csv(DEFAULT_DATASET_PATH, require_target=require_target)
