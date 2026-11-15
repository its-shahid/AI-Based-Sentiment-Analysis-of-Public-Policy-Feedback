"""
CivicPulse — AI-Based Sentiment Analysis of Public Policy Feedback
Government Policy Analytics Dashboard (Navy & White Executive Theme)

Launch locally (Windows / VS Code):
    streamlit run app.py
"""

import io
import logging
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from data.generate_dataset import generate_policy_dataset
from src.config import BEST_MODEL_PATH, DEFAULT_DATASET_PATH, EVAL_METRICS_PATH, SENTIMENT_CLASSES
from src.data_loader import DataIngestionError, load_feedback_file
from src.evaluator import (
    compute_topic_relevance_metrics,
    evaluate_and_select_best_model,
    load_saved_evaluation,
)
from src.multilingual import translate_to_english
from src.preprocessor import preprocess_dataframe
from src.sentiment_model import PolicySentimentAnalyzer
from src.summarizer import generate_policy_executive_summary
from src.topic_modeling import extract_concerns_and_suggestions, extract_topics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NAVY = "#0B1F3A"
DEEP_BLUE = "#163A70"
ROYAL_BLUE = "#2563EB"
SENTIMENT_COLORS = {
    "Positive": "#16A34A",
    "Neutral": "#D97706",
    "Negative": "#DC2626",
}

st.set_page_config(
    page_title="CivicPulse | Public Policy Sentiment Analytics",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Executive Navy-Blue & White Government Analytics Theme + Elevated Font Scale
st.markdown(
    """
    <style>
        html, body, [class*="css"] {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 16px;
            color: #0B1F3A;
        }
        .stApp { background-color: #F4F7FC; }
        .block-container { padding-top: 1.75rem; padding-bottom: 2.5rem; max-width: 1400px; }
        section[data-testid="stSidebar"] {
            background-color: #0B1F3A;
            color: #FFFFFF;
        }
        section[data-testid="stSidebar"] * {
            color: #E2E8F0;
            font-size: 15px;
        }
        section[data-testid="stSidebar"] h1,
        section[data-testid="stSidebar"] h2,
        section[data-testid="stSidebar"] h3 {
            color: #FFFFFF !important;
        }
        section[data-testid="stSidebar"] input,
        section[data-testid="stSidebar"] select,
        section[data-testid="stSidebar"] div[data-baseweb="select"] > div {
            background-color: #163A70 !important;
            color: #FFFFFF !important;
            border-color: #274D8A !important;
        }
        h1 { font-size: 30px !important; font-weight: 700 !important; color: #0B1F3A !important; }
        h2, h3 { font-size: 22px !important; font-weight: 600 !important; color: #0B1F3A !important; }
        div[data-testid="stMetric"] {
            background-color: #FFFFFF;
            border: 1px solid #DCE5F2;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 2px 8px rgba(11, 31, 58, 0.05);
        }
        div[data-testid="stMetricValue"] {
            font-size: 34px !important;
            font-weight: 700 !important;
            color: #0B1F3A !important;
        }
        div[data-testid="stMetricLabel"] {
            font-size: 14px !important;
            color: #475569 !important;
        }
        button[data-baseweb="tab"] {
            font-size: 15px !important;
            font-weight: 600 !important;
            padding: 10px 18px !important;
        }
    </style>
    """,
    unsafe_allow_html=True,
)


def style_plotly_fig(fig: go.Figure, height: int = 380) -> go.Figure:
    fig.update_layout(
        height=height,
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        font=dict(family="Inter, Segoe UI, sans-serif", size=14, color="#0B1F3A"),
        margin=dict(l=16, r=20, t=24, b=16),
        legend=dict(font=dict(size=13), orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        hoverlabel=dict(bgcolor="#0B1F3A", font_size=13, font_color="#FFFFFF"),
    )
    fig.update_xaxes(gridcolor="#E8EEF6", tickfont=dict(size=13))
    fig.update_yaxes(gridcolor="#E8EEF6", tickfont=dict(size=13))
    return fig


@st.cache_resource(show_spinner="Initializing NLP models & evaluation benchmarks...")
def load_or_train_resources():
    if not DEFAULT_DATASET_PATH.exists():
        generate_policy_dataset(num_records=600, output_path=DEFAULT_DATASET_PATH)

    base_df = preprocess_dataframe(
        load_feedback_file(DEFAULT_DATASET_PATH, filename=DEFAULT_DATASET_PATH.name, require_target=True)
    )

    if BEST_MODEL_PATH.exists() and EVAL_METRICS_PATH.exists():
        analyzer = PolicySentimentAnalyzer(BEST_MODEL_PATH).load()
        eval_summary = load_saved_evaluation(EVAL_METRICS_PATH)
    else:
        analyzer, eval_summary = evaluate_and_select_best_model(base_df, save_artifacts=True)

    return analyzer, eval_summary


@st.cache_data(show_spinner=False)
def prepare_dataset(file_bytes: bytes | None = None, file_name: str = "public_policy_feedback.csv") -> tuple[pd.DataFrame, dict]:
    """Load default or uploaded multi-format file (CSV, Excel, JSON, TXT, PDF) and preprocess all rows."""
    if file_bytes is not None:
        raw_df = load_feedback_file(io.BytesIO(file_bytes), filename=file_name, require_target=False)
    else:
        raw_df = load_feedback_file(DEFAULT_DATASET_PATH, filename=DEFAULT_DATASET_PATH.name, require_target=False)

    meta = dict(raw_df.attrs)
    processed = preprocess_dataframe(raw_df)
    return processed, meta


def main() -> None:
    st.title("CivicPulse — Public Policy Sentiment Analytics")
    st.caption(
        "Government Consultation & Citizen Feedback Intelligence · English & Hindi NLP · "
        "Multi-Format Ingestion (.csv, .xlsx, .xls, .json, .txt, .pdf)"
    )

    try:
        analyzer, eval_summary = load_or_train_resources()
    except Exception as exc:
        st.error(f"Failed to initialize ML pipeline: {exc}")
        st.stop()

    # --- Sidebar: Multi-Format Upload & Filters ---
    with st.sidebar:
        st.header("Dataset & Filters")
        uploaded_file = st.file_uploader(
            "Upload Feedback Dataset",
            type=["csv", "xlsx", "xls", "json", "txt", "pdf"],
            help="Supports CSV, Excel, JSON, TXT, and PDF. Automatically detects feedback_text or aliases (comment, opinion, review, etc.).",
        )

        try:
            if uploaded_file is not None:
                source_name = uploaded_file.name
                df, meta = prepare_dataset(uploaded_file.getvalue(), source_name)
            else:
                source_name = "public_policy_feedback.csv"
                df, meta = prepare_dataset(None, source_name)
            df = analyzer.predict_dataframe(df)
        except DataIngestionError as exc:
            st.error(f"File Validation Error: {exc}")
            st.stop()
        except Exception as exc:
            st.error(f"Processing Error: {exc}")
            st.stop()

        total_loaded = len(df)
        file_type = meta.get("file_type", "CSV")
        raw_rows = meta.get("raw_row_count", total_loaded)

        st.success(f"Loaded {total_loaded:,} valid records ({file_type}) from {source_name}")

        all_policies = ["All Policies"] + sorted(df["policy_name"].unique().tolist())
        selected_policy = st.selectbox("Policy Scheme", all_policies)

        all_languages = sorted(df["language"].unique().tolist())
        selected_languages = st.multiselect("Language", all_languages, default=all_languages)

        selected_sentiments = st.multiselect(
            "Predicted Sentiment",
            SENTIMENT_CLASSES,
            default=SENTIMENT_CLASSES,
        )

        all_regions = ["All Regions"] + sorted(df["region"].unique().tolist())
        selected_region = st.selectbox("Region / State", all_regions)

        min_date = df["submitted_date"].min().date()
        max_date = df["submitted_date"].max().date()
        date_range = st.date_input("Submission Date Range", value=(min_date, max_date))

        search_query = st.text_input("Keyword Search", placeholder="e.g., subsidy, देरी, portal...")

    # Apply filters
    filtered = df.copy()
    if selected_policy != "All Policies":
        filtered = filtered[filtered["policy_name"] == selected_policy]
    if selected_languages:
        filtered = filtered[filtered["language"].isin(selected_languages)]
    if selected_sentiments:
        filtered = filtered[filtered["predicted_sentiment"].isin(selected_sentiments)]
    if selected_region != "All Regions":
        filtered = filtered[filtered["region"] == selected_region]
    if isinstance(date_range, (list, tuple)) and len(date_range) == 2:
        start_d, end_d = pd.to_datetime(date_range[0]), pd.to_datetime(date_range[1])
        filtered = filtered[(filtered["submitted_date"] >= start_d) & (filtered["submitted_date"] <= end_d)]
    if search_query.strip():
        q = search_query.strip()
        filtered = filtered[filtered["feedback_text"].str.contains(q, case=False, na=False)]

    with st.sidebar:
        st.markdown(f"**Extracted:** {raw_rows:,} · **Valid:** {total_loaded:,} · **Active:** {len(filtered):,}")

    # --- Top KPI Strip ---
    total_count = len(filtered)
    pos_pct = round((filtered["predicted_sentiment"] == "Positive").mean() * 100, 1) if total_count else 0.0
    neg_pct = round((filtered["predicted_sentiment"] == "Negative").mean() * 100, 1) if total_count else 0.0
    neu_pct = round((filtered["predicted_sentiment"] == "Neutral").mean() * 100, 1) if total_count else 0.0
    hindi_pct = round(filtered["language"].str.contains("Hindi", case=False).mean() * 100, 1) if total_count else 0.0

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Total / Active Records", f"{total_count:,}", delta=f"of {total_loaded:,} loaded", delta_color="off")
    k2.metric("Positive Sentiment", f"{pos_pct}%")
    k3.metric("Neutral / Suggestions", f"{neu_pct}%")
    k4.metric("Negative / Concerns", f"{neg_pct}%")
    k5.metric("Hindi Responses", f"{hindi_pct}%")

    # --- Navigation Tabs ---
    tab_overview, tab_topics, tab_explorer, tab_live, tab_eval = st.tabs([
        "Overview & Trends",
        "Topics & Summary",
        "Feedback Explorer",
        "Live Analyzer",
        "Model Evaluation",
    ])

    # TAB 1: OVERVIEW & TRENDS
    with tab_overview:
        if filtered.empty:
            st.warning("No feedback records match your current sidebar filters.")
        else:
            c1, c2 = st.columns([1.2, 1])

            with c1:
                st.subheader("Monthly Sentiment Trend")
                trend_df = (
                    filtered.groupby(["month", "predicted_sentiment"])
                    .size()
                    .reset_index(name="count")
                    .sort_values("month")
                )
                fig_trend = px.line(
                    trend_df,
                    x="month",
                    y="count",
                    color="predicted_sentiment",
                    color_discrete_map=SENTIMENT_COLORS,
                    markers=True,
                    labels={"month": "Month", "count": "Feedback Volume", "predicted_sentiment": "Sentiment"},
                )
                st.plotly_chart(style_plotly_fig(fig_trend, 370), use_container_width=True)

            with c2:
                st.subheader("Sentiment Distribution")
                dist_df = filtered["predicted_sentiment"].value_counts().reset_index()
                dist_df.columns = ["Sentiment", "Count"]
                fig_pie = px.pie(
                    dist_df,
                    names="Sentiment",
                    values="Count",
                    hole=0.52,
                    color="Sentiment",
                    color_discrete_map=SENTIMENT_COLORS,
                )
                st.plotly_chart(style_plotly_fig(fig_pie, 370), use_container_width=True)

            c3, c4 = st.columns([1.25, 1])
            with c3:
                st.subheader("Policy-Wise Sentiment Comparison")
                policy_df = (
                    filtered.groupby(["policy_name", "predicted_sentiment"])
                    .size()
                    .reset_index(name="count")
                )
                fig_policy = px.bar(
                    policy_df,
                    y="policy_name",
                    x="count",
                    color="predicted_sentiment",
                    orientation="h",
                    color_discrete_map=SENTIMENT_COLORS,
                    barmode="stack",
                    labels={"policy_name": "", "count": "Responses", "predicted_sentiment": "Sentiment"},
                )
                st.plotly_chart(style_plotly_fig(fig_policy, 370), use_container_width=True)

            with c4:
                st.subheader("Language Distribution")
                lang_df = (
                    filtered.groupby(["language", "predicted_sentiment"])
                    .size()
                    .reset_index(name="count")
                )
                fig_lang = px.bar(
                    lang_df,
                    x="language",
                    y="count",
                    color="predicted_sentiment",
                    color_discrete_map=SENTIMENT_COLORS,
                    barmode="group",
                    labels={"language": "Language", "count": "Responses", "predicted_sentiment": "Sentiment"},
                )
                st.plotly_chart(style_plotly_fig(fig_lang, 370), use_container_width=True)

    # TAB 2: TOPICS & SUMMARY
    with tab_topics:
        if len(filtered) < 6:
            st.info("Select at least 6 feedback rows to run NMF/LDA topic modeling and summarization.")
        else:
            col_method, col_ntopics = st.columns([1, 1])
            with col_method:
                tm_method = st.radio("Topic Modeling Algorithm", ["NMF", "LDA"], horizontal=True)
            with col_ntopics:
                n_topics = st.slider("Number of Topics", min_value=2, max_value=7, value=5)

            general_topics = extract_topics(filtered["cleaned_text"], num_topics=n_topics, method=tm_method)
            concern_suggestion_bundle = extract_concerns_and_suggestions(filtered)

            st.subheader(f"Topic Frequency & Keywords ({tm_method})")
            if general_topics:
                topic_df = pd.DataFrame(general_topics)
                topic_df["keywords_str"] = topic_df["keywords"].apply(lambda k: ", ".join(k))
                fig_tm = px.bar(
                    topic_df,
                    x="document_count",
                    y="label",
                    orientation="h",
                    text="share_percent",
                    labels={"document_count": "Assigned Responses", "label": "Theme"},
                )
                fig_tm.update_traces(texttemplate="%{text}%", textposition="outside", marker_color=ROYAL_BLUE)
                fig_tm = style_plotly_fig(fig_tm, 340)
                fig_tm.update_yaxes(autorange="reversed")
                st.plotly_chart(fig_tm, use_container_width=True)

            st.divider()
            st.subheader("Plain-Language Policy Brief (Extractive TextRank)")
            summary_scope = selected_policy if selected_policy != "All Policies" else "All Policies"
            summary = generate_policy_executive_summary(filtered, policy_name=summary_scope)
            st.info(summary["plain_language_verdict"])

            s1, s2, s3 = st.columns(3)
            with s1:
                st.markdown("#### Arguments For (Positive)")
                for item in summary["positive_highlights"] or ["No positive highlights in current filter."]:
                    st.success(item)
            with s2:
                st.markdown("#### Arguments Against (Concerns)")
                for item in summary["concern_highlights"] or ["No negative concerns in current filter."]:
                    st.error(item)
            with s3:
                st.markdown("#### Citizen Suggestions (Neutral)")
                for item in summary["suggestion_highlights"] or ["No suggestions in current filter."]:
                    st.warning(item)

            with st.expander("View Concern & Suggestion Topic Clusters"):
                cc1, cc2 = st.columns(2)
                with cc1:
                    st.markdown("**Top Negative Concern Clusters**")
                    for t in concern_suggestion_bundle["common_concerns"]:
                        st.write(f"- **Topic {t['topic_id']}** ({t['document_count']} docs): {', '.join(t['keywords'])}")
                with cc2:
                    st.markdown("**Top Constructive Suggestion Clusters**")
                    for t in concern_suggestion_bundle["citizen_suggestions"]:
                        st.write(f"- **Topic {t['topic_id']}** ({t['document_count']} docs): {', '.join(t['keywords'])}")

    # TAB 3: FEEDBACK EXPLORER
    with tab_explorer:
        st.subheader("Citizen Feedback Explorer")
        display_cols = [
            "feedback_id",
            "submitted_date",
            "policy_name",
            "region",
            "channel",
            "language",
            "predicted_sentiment",
            "confidence",
            "feedback_text",
        ]
        explorer_df = filtered[display_cols].copy()
        explorer_df["submitted_date"] = explorer_df["submitted_date"].dt.strftime("%Y-%m-%d")

        st.dataframe(explorer_df, use_container_width=True, height=460, hide_index=True)

        csv_export = explorer_df.to_csv(index=False).encode("utf-8-sig")
        st.download_button(
            label="Export Filtered Feedback as CSV",
            data=csv_export,
            file_name="filtered_policy_sentiment_results.csv",
            mime="text/csv",
        )

    # TAB 4: LIVE ANALYZER
    with tab_live:
        st.subheader("Live Multilingual Analyzer (English · हिन्दी · Hinglish)")
        sample_choice = st.selectbox(
            "Load Sample Comment",
            [
                "Custom Input",
                "English (Positive): Transparent digital prescription records reduced duplicate medical tests.",
                "English (Negative): Subsidy reimbursement for EV two-wheelers has been delayed for six months.",
                "Hindi (Positive): गांव में सोलर माइक्रोग्रिड लगने से शाम की बिजली कटौती समाप्त हो गई है।",
                "Hindi (Negative): खराब स्मार्ट मीटर के कारण पानी न आने पर भी तीन गुना अधिक बिल आ रहा है।",
                "Hinglish (Neutral): Bus subsidy accha hai lekin night schedule 11 PM tak extend karna chahiye.",
            ],
        )

        default_text = "" if sample_choice == "Custom Input" else sample_choice.split(": ", 1)[1]
        user_input = st.text_area("Enter policy feedback:", value=default_text, height=130)

        if st.button("Analyze Feedback", type="primary"):
            if not user_input.strip():
                st.warning("Please enter feedback text before analyzing.")
            else:
                result = analyzer.predict_single(user_input)
                r1, r2, r3 = st.columns(3)
                r1.metric("Predicted Sentiment", result["sentiment"])
                r2.metric("Confidence", f"{result['confidence'] * 100:.1f}%")
                r3.metric("Detected Language", result["language_detected"])

                prob_df = pd.DataFrame({
                    "Sentiment": list(result["probabilities"].keys()),
                    "Probability": list(result["probabilities"].values()),
                })
                fig_prob = px.bar(
                    prob_df,
                    x="Sentiment",
                    y="Probability",
                    color="Sentiment",
                    color_discrete_map=SENTIMENT_COLORS,
                    range_y=[0, 1],
                )
                st.plotly_chart(style_plotly_fig(fig_prob, 290), use_container_width=True)

                if result["language_detected"].startswith("Hindi"):
                    translated, is_live = translate_to_english(user_input, source_lang="hi")
                    mode_note = "Live Translator" if is_live else "Offline Gloss Enrichment"
                    st.info(f"**English Cross-Lingual View ({mode_note}):** {translated}")

    # TAB 5: MODEL EVALUATION
    with tab_eval:
        st.subheader("Model Evaluation & Topic Relevance")
        st.caption(
            f"Train Split: {eval_summary['train_size']} rows (80%) · "
            f"Test Split: {eval_summary['test_size']} rows (20%) · "
            f"Best Model: {eval_summary['best_model']}"
        )

        models_list = eval_summary["models"]
        comp_df = pd.DataFrame([
            {
                "Model": m["model_name"],
                "Accuracy": m["accuracy"],
                "Precision (Macro)": m["precision_macro"],
                "Recall (Macro)": m["recall_macro"],
                "F1-Score (Macro)": m["f1_macro"],
                "5-Fold CV F1": f"{m['cv_f1_mean']:.4f} ± {m['cv_f1_std']:.4f}",
            }
            for m in models_list
        ])
        st.dataframe(comp_df, use_container_width=True, hide_index=True)

        chosen_model_name = st.selectbox(
            "Inspect Confusion Matrix & Per-Class Report",
            [m["model_name"] for m in models_list],
        )
        chosen = next(m for m in models_list if m["model_name"] == chosen_model_name)

        cm_col, per_class_col = st.columns([1, 1.1])
        with cm_col:
            cm_fig = go.Figure(
                data=go.Heatmap(
                    z=chosen["confusion_matrix"],
                    x=chosen["labels"],
                    y=chosen["labels"],
                    colorscale=[[0, "#F4F7FC"], [1, "#0B1F3A"]],
                    text=chosen["confusion_matrix"],
                    texttemplate="%{text}",
                    showscale=True,
                )
            )
            cm_fig.update_layout(
                title=f"Confusion Matrix — {chosen_model_name}",
                xaxis_title="Predicted Label",
                yaxis_title="Actual Label",
            )
            st.plotly_chart(style_plotly_fig(cm_fig, 360), use_container_width=True)

        with per_class_col:
            st.markdown(f"#### Per-Class Classification Metrics ({chosen_model_name})")
            per_class_rows = [
                {
                    "Class": cls,
                    "Precision": vals["precision"],
                    "Recall": vals["recall"],
                    "F1-Score": vals["f1_score"],
                    "Support": vals["support"],
                }
                for cls, vals in chosen["per_class"].items()
            ]
            st.dataframe(pd.DataFrame(per_class_rows), use_container_width=True, hide_index=True)

            if len(df) >= 6:
                live_topics = extract_topics(df["cleaned_text"], num_topics=5, method="NMF")
                tm_metrics = compute_topic_relevance_metrics(live_topics, df["cleaned_text"])
                st.markdown("#### Topic-Extraction Relevance (Active Dataset)")
                t1, t2, t3 = st.columns(3)
                t1.metric("Distinctiveness", f"{tm_metrics['topic_distinctiveness'] * 100:.1f}%")
                t2.metric("NPMI Coherence", f"{tm_metrics['coherence_score']:.3f}")
                t3.metric("Topic Coverage", f"{tm_metrics['coverage_percent']}%")


if __name__ == "__main__":
    main()
