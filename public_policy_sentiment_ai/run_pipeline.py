"""
End-to-end CLI pipeline runner:
1. Generates sample CSV if missing
2. Ingests & validates dataset
3. Preprocesses bilingual English/Hindi feedback
4. Trains & benchmarks Logistic Regression, Naive Bayes, and Linear SVM
5. Runs Topic Modeling (Concerns & Suggestions) and Extractive Summarization
6. Saves best model & evaluation metrics to models/
"""

import logging
import sys
from pathlib import Path

# Ensure root directory is on PYTHONPATH when executed directly
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from data.generate_dataset import generate_policy_dataset
from src.config import DEFAULT_DATASET_PATH
from src.data_loader import load_feedback_csv
from src.evaluator import evaluate_and_select_best_model
from src.preprocessor import preprocess_dataframe
from src.summarizer import generate_policy_executive_summary
from src.topic_modeling import extract_concerns_and_suggestions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("run_pipeline")


def main() -> None:
    if not DEFAULT_DATASET_PATH.exists():
        logger.info("Sample dataset not found. Generating 600 bilingual records...")
        generate_policy_dataset(num_records=600, output_path=DEFAULT_DATASET_PATH)

    logger.info("Loading dataset from %s", DEFAULT_DATASET_PATH)
    raw_df = load_feedback_csv(DEFAULT_DATASET_PATH, require_target=True)
    clean_df = preprocess_dataframe(raw_df)
    logger.info("Loaded and cleaned %d unique feedback records.", len(clean_df))

    logger.info("Training and benchmarking candidate sentiment models...")
    analyzer, eval_summary = evaluate_and_select_best_model(clean_df, save_artifacts=True)

    print("\n=== MODEL BENCHMARK SUMMARY ===")
    for m in eval_summary["models"]:
        print(
            f"{m['model_name']:<26} | Acc: {m['accuracy']:.4f} | "
            f"Prec: {m['precision_macro']:.4f} | Rec: {m['recall_macro']:.4f} | "
            f"F1: {m['f1_macro']:.4f}"
        )
    print(f"\nSelected Best Model: {eval_summary['best_model']}")

    annotated_df = analyzer.predict_dataframe(clean_df)
    topics = extract_concerns_and_suggestions(annotated_df)
    print("\n=== TOP COMMON CONCERNS (NEGATIVE TOPIC CLUSTERS) ===")
    for t in topics["common_concerns"]:
        print(f"Topic {t['topic_id']}: {', '.join(t['keywords'])} ({t['document_count']} mentions)")

    summary = generate_policy_executive_summary(annotated_df)
    print("\n=== AUTOMATIC PUBLIC OPINION SUMMARY (ALL POLICIES) ===")
    print(f"Sentiment Breakdown: {summary['sentiment_breakdown']}")
    for line in summary["concern_highlights"]:
        print(f" - Concern: {line}")


if __name__ == "__main__":
    main()
