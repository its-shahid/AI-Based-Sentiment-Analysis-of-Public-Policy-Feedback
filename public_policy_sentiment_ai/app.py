"""
CivicPulse — AI-Based Sentiment Analysis of Public Policy Feedback
Interactive Streamlit Dashboard for Policy Analysts & Citizen Feedback Exploration.

Launch locally (Windows / VS Code):
    streamlit run app.py
"""

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
from src.data_loader import DataIngestionError, load_feedback_csv
from src.evaluator import evaluate_and_select_best_model, load_saved_evaluation
from src.multilingual import translate_to_english
from src.preprocessor import preprocess_dataframe
from src.sentiment_model import PolicySentimentAnalyzer
from src.summarizer import generate_policy_executive_summary
from src.topic_modeling import extract_concerns_and_suggestions, extract_topics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SENTIMENT_COLORS = {
    "Positive": "#15803D",
    "Neutral": "#B45309",
    "Negative": "#B91C1C",
}

st.set_page_config(
    page_title="CivicPulse | Public Policy Sentiment AI",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Clean editorial dashboard CSS
st.markdown(
    """
    <style>
        .block-container { padding-top: 1.5rem; padding-bottom: 2rem; }
        div[data-testid="stMetric"] {
            background-color: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 14px 18px;
        }
        .policy-card {
            background-color: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 12px;
        }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource(show_spinner="Initializing NLP models & evaluation benchmarks...")
def load_or_train_resources():
    """Ensure sample dataset, trained model, and evaluation metrics exist."""
    if not DEFAULT_DATASET_PATH.exists():
        generate_policy_dataset(num_records=600, output_path=DEFAULT_DATASET_PATH)

    base_df = preprocess_dataframe(load_feedback_csv(DEFAULT_DATASET_PATH, require_target=True))

    if BEST_MODEL_PATH.exists() and EVAL_METRICS_PATH.exists():
        analyzer = PolicySentimentAnalyzer(BEST_MODEL_PATH).load()
        eval_summary = load_saved_evaluation(EVAL_METRICS_PATH)
    else:
        analyzer, eval_summary = evaluate_and_select_best_model(base_df, save_artifacts=True)

    return analyzer, eval_summary


@st.cache_data(show_spinner=False)
def prepare_dataset(file_bytes: bytes | None = None, file_name: str = "public_policy_feedback.csv") -> pd.DataFrame:
    """Load default or uploaded CSV (keyed by raw bytes) and preprocess all rows."""
    import io

    if file_bytes is not None:
        raw_df = load_feedback_csv(io.BytesIO(file_bytes), require_target=False)
    else:
        raw_df = load_feedback_csv(DEFAULT_DATASET_PATH, require_target=False)
    return preprocess_dataframe(raw_df)


def main() -> None:
    st.title("AI-Based Sentiment Analysis of Public Policy Feedback")
    st.caption(
        "Multilingual (English & Hindi) NLP Pipeline · Sentiment Classification · "
        "Topic Modeling · Extractive Opinion Summarization"
    )

    try:
        analyzer, eval_summary = load_or_train_resources()
    except Exception as exc:
        st.error(f"Failed to initialize ML pipeline: {exc}")
        st.stop()

    # --- Sidebar: Data Upload & Interactive Filters ---
    with st.sidebar:
        st.header("Dataset & Filters")
        uploaded_file = st.file_uploader(
            "Upload Custom Feedback CSV",
            type=["csv"],
            help="Required columns: feedback_id, submitted_date, policy_name, region, channel, language, feedback_text",
        )

        try:
            if uploaded_file is not None:
                source_name = uploaded_file.name
                df = prepare_dataset(uploaded_file.getvalue(), source_name)
            else:
                source_name = "public_policy_feedback.csv"
                df = prepare_dataset(None, source_name)
            df = analyzer.predict_dataframe(df)
        except DataIngestionError as exc:
            st.error(f"CSV Validation Error: {exc}")
            st.stop()
        except Exception as exc:
            st.error(f"Processing Error: {exc}")
            st.stop()

        total_loaded = len(df)
        st.success(f"Loaded {total_loaded:,} feedback records from `{source_name}`.")

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
        st.caption(f"Active: {len(filtered):,} / {total_loaded:,} rows")

    # --- Top KPI Strip ---
    total_count = len(filtered)
    pos_pct = round((filtered["predicted_sentiment"] == "Positive").mean() * 100, 1) if total_count else 0.0
    neg_pct = round((filtered["predicted_sentiment"] == "Negative").mean() * 100, 1) if total_count else 0.0
    neu_pct = round((filtered["predicted_sentiment"] == "Neutral").mean() * 100, 1) if total_count else 0.0
    hindi_pct = round(filtered["language"].str.contains("Hindi", case=False).mean() * 100, 1) if total_count else 0.0

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Total / Active Feedback", f"{total_count:,}", delta=f"of {total_loaded:,} loaded", delta_color="off")
    k2.metric("Positive Share", f"{pos_pct}%")
    k3.metric("Neutral / Suggestions", f"{neu_pct}%")
    k4.metric("Negative / Concerns", f"{neg_pct}%")
    k5.metric("Hindi Responses", f"{hindi_pct}%")

    # --- Main Navigation Tabs ---
    tab_overview, tab_topics, tab_explorer, tab_live, tab_eval = st.tabs([
        "Overview & Trends",
        "Topics & Policy Summary",
        "Feedback Explorer",
        "Live Multilingual Analyzer",
        "Model Evaluation",
    ])

    # =========================================================================
    # TAB 1: OVERVIEW & TRENDS
    # =========================================================================
    with tab_overview:
        if filtered.empty:
            st.warning("No feedback records match your current sidebar filters.")
        else:
            c1, c2 = st.columns([1.15, 1])

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
                fig_trend.update_layout(height=360, margin=dict(l=10, r=10, t=20, b=10), legend_title_text="")
                st.plotly_chart(fig_trend, use_container_width=True)

            with c2:
                st.subheader("Sentiment Distribution")
                dist_df = filtered["predicted_sentiment"].value_counts().reset_index()
                dist_df.columns = ["Sentiment", "Count"]
                fig_pie = px.pie(
                    dist_df,
                    names="Sentiment",
                    values="Count",
                    hole=0.48,
                    color="Sentiment",
                    color_discrete_map=SENTIMENT_COLORS,
                )
                fig_pie.update_layout(height=360, margin=dict(l=10, r=10, t=20, b=10))
                st.plotly_chart(fig_pie, use_container_width=True)

            c3, c4 = st.columns([1.3, 1])
            with c3:
                st.subheader("Sentiment by Public Policy")
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
                fig_policy.update_layout(height=360, margin=dict(l=10, r=10, t=20, b=10), legend_title_text="")
                st.plotly_chart(fig_policy, use_container_width=True)

            with c4:
                st.subheader("Language & Channel Mix")
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
                    labels={"language": "Language", "count": "Count", "predicted_sentiment": "Sentiment"},
                )
                fig_lang.update_layout(height=360, margin=dict(l=10, r=10, t=20, b=10), legend_title_text="")
                st.plotly_chart(fig_lang, use_container_width=True)

    # =========================================================================
    # TAB 2: TOPIC MODELING & AUTOMATIC POLICY SUMMARIZATION
    # =========================================================================
    with tab_topics:
        if len(filtered) < 6:
            st.info("Select at least 6 feedback rows to run NMF/LDA topic modeling and summarization.")
        else:
            col_method, col_ntopics = st.columns([1, 1])
            with col_method:
                tm_method = st.radio("Topic Modeling Algorithm", ["NMF", "LDA"], horizontal=True)
            with col_ntopics:
                n_topics = st.slider("Number of General Topics", min_value=2, max_value=7, value=5)

            general_topics = extract_topics(filtered["cleaned_text"], num_topics=n_topics, method=tm_method)
            concern_suggestion_bundle = extract_concerns_and_suggestions(filtered)

            st.subheader(f"Discovered Policy Themes ({tm_method})")
            if general_topics:
                topic_df = pd.DataFrame(general_topics)
                topic_df["keywords_str"] = topic_df["keywords"].apply(lambda k: ", ".join(k))
                fig_tm = px.bar(
                    topic_df,
                    x="document_count",
                    y="label",
                    orientation="h",
                    text="share_percent",
                    labels={"document_count": "Assigned Documents", "label": "Topic Signature"},
                )
                fig_tm.update_traces(texttemplate="%{text}%", textposition="outside", marker_color="#1D4ED8")
                fig_tm.update_layout(height=320, margin=dict(l=10, r=30, t=10, b=10), yaxis=dict(autorange="reversed"))
                st.plotly_chart(fig_tm, use_container_width=True)
                st.dataframe(
                    topic_df[["topic_id", "label", "keywords_str", "document_count", "share_percent"]].rename(
                        columns={
                            "topic_id": "Topic #",
                            "label": "Theme",
                            "keywords_str": "Top Keywords",
                            "document_count": "Docs",
                            "share_percent": "Share (%)",
                        }
                    ),
                    use_container_width=True,
                    hide_index=True,
                )

            st.divider()
            st.subheader("Automatic Policy Opinion Summary (Extractive TextRank)")
            summary_scope = selected_policy if selected_policy != "All Policies" else "All Policies"
            summary = generate_policy_executive_summary(filtered, policy_name=summary_scope)

            s1, s2, s3 = st.columns(3)
            with s1:
                st.markdown("#### Praised Aspects (Positive)")
                if summary["positive_highlights"]:
                    for item in summary["positive_highlights"]:
                        st.success(item)
                else:
                    st.caption("No positive highlights in the current selection.")

            with s2:
                st.markdown("#### Common Concerns (Negative)")
                if summary["concern_highlights"]:
                    for item in summary["concern_highlights"]:
                        st.error(item)
                else:
                    st.caption("No negative concerns in the current selection.")

            with s3:
                st.markdown("#### Citizen Suggestions (Neutral)")
                if summary["suggestion_highlights"]:
                    for item in summary["suggestion_highlights"]:
                        st.warning(item)
                else:
                    st.caption("No suggestions in the current selection.")

            with st.expander("View Granular Concern & Suggestion Topic Clusters"):
                cc1, cc2 = st.columns(2)
                with cc1:
                    st.markdown("**Top Negative Concern Clusters**")
                    for t in concern_suggestion_bundle["common_concerns"]:
                        st.write(f"- **Topic {t['topic_id']}** ({t['document_count']} docs): {', '.join(t['keywords'])}")
                with cc2:
                    st.markdown("**Top Constructive Suggestion Clusters**")
                    for t in concern_suggestion_bundle["citizen_suggestions"]:
                        st.write(f"- **Topic {t['topic_id']}** ({t['document_count']} docs): {', '.join(t['keywords'])}")

    # =========================================================================
    # TAB 3: FEEDBACK EXPLORER
    # =========================================================================
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

        st.dataframe(explorer_df, use_container_width=True, height=440, hide_index=True)

        csv_export = explorer_df.to_csv(index=False).encode("utf-8-sig")
        st.download_button(
            label="Export Filtered Feedback as CSV",
            data=csv_export,
            file_name="filtered_policy_sentiment_results.csv",
            mime="text/csv",
        )

    # =========================================================================
    # TAB 4: LIVE MULTILINGUAL ANALYZER (ENGLISH & HINDI)
    # =========================================================================
    with tab_live:
        st.subheader("Live Multilingual Feedback Analyzer (English · हिन्दी · Hinglish)")
        sample_choice = st.selectbox(
            "Load Sample Citizen Comment",
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
        user_input = st.text_area(
            "Enter public policy feedback in English, Hindi (Devanagari), or Hinglish:",
            value=default_text,
            height=120,
        )

        if st.button("Analyze Feedback", type="primary"):
            if not user_input.strip():
                st.warning("Please enter a citizen feedback comment before analyzing.")
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
                fig_prob.update_layout(height=280, showlegend=False)
                st.plotly_chart(fig_prob, use_container_width=True)

                if result["language_detected"].startswith("Hindi"):
                    translated, is_live = translate_to_english(user_input, source_lang="hi")
                    mode_note = "Live Translator" if is_live else "Offline Gloss Enrichment"
                    st.info(f"**English Cross-Lingual View ({mode_note}):** {translated}")

                st.caption(f"Preprocessed Tokens: `{result['cleaned_text']}`")

    # =========================================================================
    # TAB 5: MODEL EVALUATION & CONFUSION MATRIX
    # =========================================================================
    with tab_eval:
        st.subheader("Supervised Model Evaluation & Benchmarking")
        st.caption(
            f"Train Split: {eval_summary['train_size']} rows (80%) · "
            f"Stratified Test Split: {eval_summary['test_size']} rows (20%) · "
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
                    colorscale="Blues",
                    text=chosen["confusion_matrix"],
                    texttemplate="%{text}",
                    showscale=True,
                )
            )
            cm_fig.update_layout(
                title=f"Confusion Matrix — {chosen_model_name}",
                xaxis_title="Predicted Label",
                yaxis_title="Actual Label",
                height=360,
            )
            st.plotly_chart(cm_fig, use_container_width=True)

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

        if st.button("Re-Train & Re-Evaluate Models on Current Dataset"):
            with st.spinner("Running 5-fold cross-validation & test evaluation..."):
                if "sentiment" in df.columns:
                    new_analyzer, new_eval = evaluate_and_select_best_model(df, save_artifacts=True)
                    st.success(f"Re-training complete! Best model: {new_eval['best_model']}")
                    st.cache_resource.clear()
                else:
                    st.warning("Uploaded CSV does not include a ground-truth 'sentiment' column for training.")


if __name__ == "__main__":
    main()
