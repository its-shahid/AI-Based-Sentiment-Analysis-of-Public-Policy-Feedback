"""
Automated test suite for data ingestion, bilingual preprocessing,
multilingual detection, sentiment modeling, topic modeling, and summarization.

Run with:
    python -m unittest discover -s tests -v
or:
    pytest -v
"""

import io
import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.data_loader import DataIngestionError, load_feedback_csv, load_feedback_file
from src.multilingual import compute_lexicon_polarity, detect_language_label, translate_to_english
from src.preprocessor import clean_text, split_sentences, tokenize_bilingual


class TestDataIngestionAndPreprocessing(unittest.TestCase):
    def test_valid_csv_ingestion(self):
        csv_content = (
            "feedback_id,submitted_date,policy_name,region,channel,language,feedback_text,sentiment\n"
            "FB-0001,2026-03-10,National Digital Health Mission,Delhi NCR,Mobile App,English,"
            "\"Hospital registration was fast and helpful.\",Positive\n"
            "FB-0002,2026-03-12,Rural Solar Microgrid Scheme,Bihar,MyGov Portal,Hindi,"
            "\"सोलर बैटरी खराब है और मरम्मत में देरी हो रही है।\",Negative\n"
        )
        df = load_feedback_csv(io.StringIO(csv_content), require_target=True)
        self.assertEqual(len(df), 2)
        self.assertIn("month", df.columns)

    def test_missing_required_column_raises_error(self):
        bad_csv = "feedback_id,unrelated_col\nFB-1,Missing columns test\n"
        with self.assertRaises(DataIngestionError):
            load_feedback_csv(io.StringIO(bad_csv))

    def test_empty_csv_raises_error(self):
        with self.assertRaises(DataIngestionError):
            load_feedback_csv(io.StringIO(""))

    def test_100_row_csv_loads_all_rows_without_truncation(self):
        header = "feedback_id,submitted_date,region,channel,feedback_text,policy_name,language\n"
        sample_texts = [
            "Portal speed is very fast and helpful.",
            "Subsidy reimbursement is delayed for months.",
            "Please add regional language support.",
            "डिजिटल सेवा बहुत पारदर्शी और लाभदायक है।",
        ]
        rows = [
            f"FB-{i + 1:04d},2026-04-{(i % 28) + 1:02d},Delhi NCR,Mobile App,"
            f"\"{sample_texts[i % len(sample_texts)]}\",National Digital Health Mission,English"
            for i in range(100)
        ]
        df = load_feedback_csv(io.StringIO(header + "\n".join(rows)), require_target=False)
        self.assertEqual(len(df), 100)
        self.assertEqual(df.attrs.get("loaded_row_count"), 100)

    def test_alias_detection_and_json_txt_ingestion(self):
        json_payload = '[{"comment_text": "Solar microgrid improved evening lighting.", "state": "Bihar"}]'
        df_json = load_feedback_file(io.BytesIO(json_payload.encode("utf-8")), filename="sample.json")
        self.assertEqual(len(df_json), 1)
        self.assertEqual(df_json.iloc[0]["region"], "Bihar")
        self.assertEqual(df_json.iloc[0]["policy_name"], "Rural Solar Microgrid Scheme")

        txt_payload = "1. Hospital registration is fast and transparent.\n2. Bus subsidy reimbursement is delayed.\n"
        df_txt = load_feedback_file(io.BytesIO(txt_payload.encode("utf-8")), filename="notes.txt")
        self.assertEqual(len(df_txt), 2)

    def test_bilingual_cleaning_preserves_devanagari(self):
        raw_hi = "सरकार की योजना https://example.com बहुत लाभदायक है! 123"
        cleaned = clean_text(raw_hi, remove_stopwords=True)
        self.assertIn("लाभदायक", cleaned)
        self.assertNotIn("https", cleaned)
        self.assertNotIn("123", cleaned)

    def test_bilingual_sentence_splitting(self):
        text = "यह योजना अच्छी है। सुधार की आवश्यकता है। कृपया समय पर लागू करें।"
        sentences = split_sentences(text)
        self.assertEqual(len(sentences), 3)

    def test_tokenize_english(self):
        tokens = tokenize_bilingual("The electric bus subsidy is affordable and reliable!")
        self.assertIn("electric", tokens)
        self.assertIn("affordable", tokens)
        self.assertNotIn("the", tokens)


class TestMultilingualSupport(unittest.TestCase):
    def test_language_detection(self):
        self.assertEqual(detect_language_label("The solar microgrid reduced power cuts."), "English")
        self.assertEqual(detect_language_label("ग्रामीण क्षेत्रों में सौर ऊर्जा अत्यंत लाभदायक है।"), "Hindi")
        self.assertEqual(detect_language_label("Ye yojana bahut accha hai lekin deri ho rahi hai"), "Hindi (Hinglish)")

    def test_lexicon_polarity_english_and_hindi(self):
        pos = compute_lexicon_polarity("Transparent and reliable portal helped citizens.")
        neg = compute_lexicon_polarity("सोलर बैटरी खराब है और भ्रष्टाचार के कारण देरी हो रही है।")
        self.assertGreater(pos["Positive"], pos["Negative"])
        self.assertGreater(neg["Negative"], neg["Positive"])

    def test_offline_gloss_translation_fallback(self):
        gloss, _ = translate_to_english("अस्पताल में देरी और समस्या", source_lang="hi")
        self.assertTrue(len(gloss) > 0)


class TestMLPipelineIntegration(unittest.TestCase):
    def test_end_to_end_ml_modules_if_installed(self):
        try:
            import sklearn  # noqa: F401
        except ImportError:
            self.skipTest("scikit-learn not installed in current container environment")

        from data.generate_dataset import generate_policy_dataset
        from src.evaluator import evaluate_and_select_best_model
        from src.preprocessor import preprocess_dataframe
        from src.summarizer import generate_policy_executive_summary
        from src.topic_modeling import extract_concerns_and_suggestions

        df = generate_policy_dataset(num_records=120, output_path=ROOT_DIR / "models" / "_test_tmp.csv")
        clean_df = preprocess_dataframe(df)
        analyzer, eval_metrics = evaluate_and_select_best_model(clean_df, save_artifacts=False)
        self.assertGreaterEqual(eval_metrics["models"][0]["accuracy"], 0.70)

        pred = analyzer.predict_single("डिजिटल पोर्टल बहुत तेज और पारदर्शी है।")
        self.assertIn(pred["sentiment"], ["Positive", "Neutral", "Negative"])

        annotated = analyzer.predict_dataframe(clean_df)
        topics = extract_concerns_and_suggestions(annotated)
        self.assertIsInstance(topics["common_concerns"], list)

        summary = generate_policy_executive_summary(annotated)
        self.assertEqual(summary["total_responses"], len(annotated))

        tmp_csv = ROOT_DIR / "models" / "_test_tmp.csv"
        if tmp_csv.exists():
            tmp_csv.unlink()


if __name__ == "__main__":
    unittest.main()
