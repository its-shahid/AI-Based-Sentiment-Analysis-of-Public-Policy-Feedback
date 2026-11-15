# AI-Based Sentiment Analysis of Public Policy Feedback

An end-to-end **Natural Language Processing (NLP)** and **Machine Learning** platform built with Python, scikit-learn, Plotly, and Streamlit to analyze citizen feedback across public policies in **English** and **Hindi (Devanagari & Hinglish)**.

Designed for a CSE AI/ML capstone project and optimized to run smoothly on a **Windows 10/11 laptop (VS Code, 16GB RAM, CPU-only)**.

---

## Key Capabilities

- **Multi-Format Ingestion & Cleaning (`src/data_loader.py`, `src/preprocessor.py`)**: Supports **CSV (`.csv`), Excel (`.xlsx`, `.xls`), JSON (`.json`), TXT (`.txt`), and PDF (`.pdf`)** with automatic column-alias detection (`feedback_text`, `comment`, `opinion`, `review`, etc.), intelligent inference of missing metadata, Devanagari NFC Unicode normalization, and English/Hindi stopword removal.
- **Multilingual Language Detection & Lexicon Fusion (`src/multilingual.py`)**: Deterministic script-ratio detection (`English`, `Hindi`, `Hindi (Hinglish)`), negation-aware bilingual sentiment lexicon, and optional cross-lingual English glossing.
- **Supervised Sentiment Analysis (`src/sentiment_model.py`)**: Word (1–2 gram) + Character (`char_wb` 3–5 gram) TF-IDF `FeatureUnion` benchmarking **Logistic Regression**, **Multinomial Naive Bayes**, and **Calibrated Linear SVM**.
- **Topic Modeling (`src/topic_modeling.py`)**: NMF and LDA extraction separating **Common Concerns** (Negative cluster) from **Citizen Suggestions** (Neutral/Constructive cluster).
- **Automatic Opinion Summarization (`src/summarizer.py`)**: TF-IDF + Cosine Similarity **TextRank** extractive summarizer producing executive policy briefs.
- **Model Evaluation (`src/evaluator.py`)**: 5-fold stratified cross-validation + 80/20 test evaluation reporting Accuracy, Macro Precision, Macro Recall, Macro F1-score, per-class metrics, and Confusion Matrix.
- **Interactive Streamlit Dashboard (`app.py`)**: Multi-tab analytics console with policy/region/language/date filters, monthly trends, CSV upload, feedback explorer, and live multilingual analyzer.

---

## Folder Structure

```text
public_policy_sentiment_ai/
├── app.py                              # Main Streamlit interactive dashboard
├── run_pipeline.py                     # End-to-end CLI pipeline runner
├── requirements.txt                    # Python dependencies
├── README.md                           # Setup & execution instructions
├── data/
│   ├── generate_dataset.py             # Generates 600 English & Hindi feedback rows
│   └── public_policy_feedback.csv      # Pre-generated sample dataset
├── src/
│   ├── __init__.py
│   ├── config.py                       # Paths, stopwords, bilingual lexicon
│   ├── data_loader.py                  # CSV ingestion & schema validation
│   ├── preprocessor.py                 # Bilingual text cleaning & tokenization
│   ├── multilingual.py                 # Language detection & Hindi support
│   ├── sentiment_model.py              # TF-IDF + ML models & hybrid inference
│   ├── topic_modeling.py               # NMF / LDA concerns & suggestions
│   ├── summarizer.py                   # TextRank extractive opinion summarizer
│   └── evaluator.py                    # Accuracy, Precision, Recall, F1 & Confusion Matrix
├── models/                             # Saved .joblib models & evaluation_metrics.json
├── docs/
│   ├── PROJECT_REPORT.md               # Academic project documentation
│   └── EVALUATION_REPORT.md            # Model benchmarking & error analysis report
└── tests/
    ├── __init__.py
    └── test_pipeline.py                # Unit & integration test suite
```

---

## Windows + VS Code Installation & Launch Commands

Open the `public_policy_sentiment_ai` folder in **VS Code**, open the integrated terminal (`Ctrl + ~`), and run:

### 1. Create and Activate a Virtual Environment (PowerShell / Command Prompt)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
*(If PowerShell blocks script execution, run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once, or use Command Prompt: `.venv\Scripts\activate.bat`)*

### 2. Install Dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Generate Dataset & Train/Evaluate Models (CLI Pipeline)

```powershell
python data\generate_dataset.py
python run_pipeline.py
```

### 4. Run Automated Tests

```powershell
python -m unittest discover -s tests -v
```

### 5. Launch the Streamlit Dashboard

```powershell
streamlit run app.py
```

The dashboard opens automatically in your browser at `http://localhost:8501`.
