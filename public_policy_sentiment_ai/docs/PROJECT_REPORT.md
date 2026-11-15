# Project Report: AI-Based Sentiment Analysis of Public Policy Feedback

**Domain:** Natural Language Processing (NLP), Applied Machine Learning, Civic Informatics  
**Target Environment:** Python 3.10+, scikit-learn, Streamlit (Windows 10/11 CPU, 16GB RAM)

---

## 1. Abstract
Governments and civic bodies receive thousands of citizen comments across web portals, mobile apps, and public consultations whenever a policy is introduced or revised. Manually reading and synthesizing unstructured multilingual feedback is slow, inconsistent, and prone to human bias. This project presents an end-to-end **AI-Based Sentiment Analysis of Public Policy Feedback** system capable of ingesting bilingual (**English** and **Hindi**) feedback CSVs, classifying sentiment (**Positive**, **Negative**, **Neutral**), discovering latent policy **concerns and suggestions** via topic modeling, generating **automatic extractive summaries**, and visualizing actionable insights through an interactive **Streamlit** dashboard.

---

## 2. Problem Statement & Objectives
### Problem Statement
Public consultation portals collect heterogeneous feedback written in English, Devanagari Hindi, and Romanized Hinglish, often containing typos, URLs, and domain-specific policy terms. Policymakers lack an automated, transparent, CPU-efficient pipeline that simultaneously classifies sentiment polarity, clusters recurring grievances, and summarizes citizen recommendations.

### Core Objectives
1. Build a defensive CSV ingestion and schema validation pipeline supporting UTF-8-SIG and Windows encodings.
2. Design a bilingual NLP preprocessor preserving Devanagari Unicode vowel signs (`matras`) while filtering English and Hindi stopwords.
3. Train, compare, and persist classical ML classifiers (**Logistic Regression**, **Multinomial Naive Bayes**, **Calibrated Linear SVM**) using combined word and character n-gram TF-IDF features.
4. Extract common citizen concerns and constructive suggestions using **NMF** and **LDA** topic modeling.
5. Generate automatic opinion summaries per policy using **TextRank** extractive sentence scoring.
6. Provide an interactive **Streamlit + Plotly** dashboard with live multilingual inference and rigorous evaluation metrics.

---

## 3. System Architecture
```text
[CSV / Live Text Input]
         │
         ▼
[Data Ingestion & Schema Validator]  ──(src/data_loader.py)
         │
         ▼
[Bilingual Preprocessor & Detector]  ──(src/preprocessor.py, src/multilingual.py)
         │
         ├──────────────────────────────────────┐
         ▼                                      ▼
[TF-IDF Word + Char N-Gram Union]     [Bilingual Lexicon Scorer]
         │                                      │
         └──────────────► [Hybrid Classifier] ◄─┘ (src/sentiment_model.py)
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
[NMF/LDA Topic Modeling]  [TextRank Summarizer]  [Model Evaluator]
(src/topic_modeling.py)    (src/summarizer.py)    (src/evaluator.py)
        └────────────────────────┼────────────────────────┘
                                 ▼
                  [Interactive Streamlit Dashboard] (app.py)
```

---

## 4. Dataset Description
The project includes a reproducible generator (`data/generate_dataset.py`) producing **600 records** across **6 public policy schemes**, **10 Indian states/regions**, **5 feedback channels**, and **2 primary languages** (65% English, 35% Hindi):
1. National Digital Health Mission
2. Urban Clean Transit Subsidy
3. National Education Reform
4. Rural Solar Microgrid Scheme
5. Smart Water Metering Initiative
6. MSME Credit Guarantee Scheme

**Class Balance:** ~42% Positive, ~34% Negative, ~24% Neutral (constructive suggestions).

---

## 5. Methodology & Algorithms
### 5.1 Feature Engineering (Word + Character TF-IDF)
Because Hindi and English have distinct vocabularies and morphological inflections, a `FeatureUnion` combines:
- **Word N-grams (1, 2):** Captures phrases like *"delayed reimbursement"*, *"बिजली कटौती"*, *"transparent tracking"*.
- **Character Word-Boundary N-grams (`char_wb`, 3–5):** Captures root stems and handles minor spelling variations across both Latin and Devanagari scripts.

### 5.2 Classification & Hybrid Calibration
During live single-comment inference (`predict_single`), the trained ML model probabilities (80% weight) are blended with a negation-aware bilingual sentiment lexicon (20% weight) to handle out-of-vocabulary Hinglish and unseen Hindi expressions gracefully.

### 5.3 Topic Modeling (Concerns vs. Suggestions)
Feedback rows predicted as **Negative** are routed to an NMF/LDA topic model to isolate operational bottlenecks (e.g., *server crashes, subsidy delays, faulty meters*). Rows predicted as **Neutral** are routed separately to surface **Citizen Suggestions** (e.g., *offline QR cards, 15-day SLA, lifeline water slabs*).

### 5.4 Extractive Summarization (TextRank)
Sentences are split across both English punctuation (`. ! ?`) and Devanagari danda (`।`), vectorized via TF-IDF, connected into a cosine similarity graph, and ranked using 25 iterations of PageRank power iteration (`damping = 0.85`).

---

## 6. Hardware & Software Requirements
- **OS:** Windows 10/11 (64-bit), macOS, or Linux
- **CPU / RAM:** Intel i5/Ryzen 5 or higher, 16GB RAM (peak memory usage < 450 MB)
- **IDE:** Visual Studio Code with Python extension
- **Runtime:** Python 3.10+, Streamlit 1.32+, scikit-learn 1.4+, Plotly 5.19+

---

## 7. Future Enhancements
- Fine-tuning multilingual transformer embeddings (`IndicBERT` / `XLM-RoBERTa`) when GPU acceleration is available.
- Direct REST ingestion from municipal grievance APIs with scheduled batch topic drift alerts.
- Automated PDF policy brief export for ministry stakeholders.
