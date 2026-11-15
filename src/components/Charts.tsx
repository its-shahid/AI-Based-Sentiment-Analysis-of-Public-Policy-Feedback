import React, { useEffect, useMemo, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { FeedbackRecord, SentimentLabel, TopicCluster } from '../types/policy';

const COLORS: Record<SentimentLabel, string> = {
  Positive: '#16A34A',
  Neutral: '#D97706',
  Negative: '#DC2626',
};

const FONT_FAMILY = "'Public Sans', 'Noto Sans Devanagari', system-ui, sans-serif";

interface PlotlyChartProps {
  data: Array<Record<string, unknown>>;
  layout: Record<string, unknown>;
  height?: number;
  ariaLabel: string;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout,
  height = 320,
  ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mergedLayout: Record<string, unknown> = {
      font: {
        family: FONT_FAMILY,
        size: 13,
        color: '#0B1F3A',
      },
      paper_bgcolor: '#FFFFFF',
      plot_bgcolor: '#FFFFFF',
      hoverlabel: {
        bgcolor: '#0B1F3A',
        bordercolor: '#163A70',
        font: { family: FONT_FAMILY, size: 13, color: '#FFFFFF' },
      },
      ...layout,
      height,
    };

    const config: Record<string, unknown> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    };

    void Plotly.react(el, data, mergedLayout, config);

    const observer = new ResizeObserver(() => {
      if (el) {
        try {
          Plotly.Plots.resize(el);
        } catch {
          // Ignore resize errors while unmounting
        }
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [data, layout, height]);

  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el) {
        try {
          Plotly.purge(el);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className="w-full"
      style={{ minHeight: `${height}px` }}
    />
  );
};

export const MonthlyTrendChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const series = useMemo(() => {
    const monthMap = new Map<string, Record<SentimentLabel, number>>();
    for (const r of records) {
      if (!monthMap.has(r.month)) {
        monthMap.set(r.month, { Positive: 0, Neutral: 0, Negative: 0 });
      }
      monthMap.get(r.month)![r.predicted_sentiment] += 1;
    }
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, counts]) => ({ month, ...counts }));
  }, [records]);

  if (series.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-[15px] text-[#475569]">
        No monthly trend data available for the active filters.
      </div>
    );
  }

  const xValues = series.map((d) => d.month);
  const traces: Array<Record<string, unknown>> = (['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map(
    (label) => ({
      type: 'scatter',
      mode: 'lines+markers',
      name: label,
      x: xValues,
      y: series.map((d) => d[label]),
      line: { color: COLORS[label], width: 3 },
      marker: { size: 8, color: COLORS[label], line: { color: '#FFFFFF', width: 1.5 } },
      hovertemplate: `<b>${label}</b><br>Month: %{x}<br>Responses: %{y}<extra></extra>`,
    })
  );

  const layout: Record<string, unknown> = {
    margin: { l: 48, r: 16, t: 36, b: 48 },
    hovermode: 'x unified',
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.04,
      xanchor: 'right',
      x: 1,
      font: { size: 13, color: '#0B1F3A' },
    },
    xaxis: {
      title: { text: 'Consultation Month', font: { size: 13, color: '#334155' } },
      showgrid: false,
      tickfont: { size: 12, color: '#334155' },
      linecolor: '#CBD8EC',
    },
    yaxis: {
      title: { text: 'Feedback Count', font: { size: 13, color: '#334155' } },
      gridcolor: '#E2E8F0',
      zerolinecolor: '#CBD8EC',
      tickfont: { size: 12, color: '#334155' },
    },
  };

  return (
    <PlotlyChart
      data={traces}
      layout={layout}
      height={320}
      ariaLabel="Interactive Monthly Sentiment Trend Chart"
    />
  );
};

export const SentimentDonutChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const counts = useMemo(() => {
    const c: Record<SentimentLabel, number> = { Positive: 0, Neutral: 0, Negative: 0 };
    for (const r of records) c[r.predicted_sentiment] += 1;
    return c;
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-[15px] text-[#475569]">
        No feedback records available to chart.
      </div>
    );
  }

  const labels: SentimentLabel[] = ['Positive', 'Neutral', 'Negative'];
  const values = labels.map((l) => counts[l]);

  const traces: Array<Record<string, unknown>> = [
    {
      type: 'pie',
      labels,
      values,
      hole: 0.56,
      sort: false,
      marker: {
        colors: labels.map((l) => COLORS[l]),
        line: { color: '#FFFFFF', width: 2.5 },
      },
      textinfo: 'percent',
      textfont: { size: 13, color: '#FFFFFF', family: FONT_FAMILY },
      hovertemplate: '<b>%{label}</b><br>Responses: %{value:,}<br>Share: %{percent}<extra></extra>',
    },
  ];

  const layout: Record<string, unknown> = {
    margin: { l: 12, r: 12, t: 24, b: 48 },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'top',
      y: -0.06,
      xanchor: 'center',
      x: 0.5,
      font: { size: 13, color: '#0B1F3A' },
    },
    annotations: [
      {
        text: `<b>${records.length.toLocaleString()}</b><br><span style="font-size:12px;color:#475569">Total</span>`,
        showarrow: false,
        font: { size: 22, color: '#0B1F3A', family: FONT_FAMILY },
        x: 0.5,
        y: 0.5,
      },
    ],
  };

  return (
    <PlotlyChart
      data={traces}
      layout={layout}
      height={320}
      ariaLabel="Interactive Sentiment Distribution Donut Chart"
    />
  );
};

export const PolicyBreakdownChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const rows = useMemo(() => {
    const map = new Map<string, Record<SentimentLabel, number>>();
    for (const r of records) {
      if (!map.has(r.policy_name)) map.set(r.policy_name, { Positive: 0, Neutral: 0, Negative: 0 });
      map.get(r.policy_name)![r.predicted_sentiment] += 1;
    }
    return Array.from(map.entries())
      .map(([policy, counts]) => ({
        policy,
        ...counts,
        total: counts.Positive + counts.Neutral + counts.Negative,
      }))
      .sort((a, b) => a.total - b.total);
  }, [records]);

  if (rows.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-[15px] text-[#475569]">
        No policies match the current filter selection.
      </div>
    );
  }

  const yLabels = rows.map((r) => (r.policy.length > 34 ? `${r.policy.slice(0, 32)}…` : r.policy));
  const traces: Array<Record<string, unknown>> = (['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map(
    (label) => ({
      type: 'bar',
      orientation: 'h',
      name: label,
      y: yLabels,
      x: rows.map((r) => r[label]),
      customdata: rows.map((r) => r.policy),
      marker: { color: COLORS[label] },
      hovertemplate: `<b>%{customdata}</b><br>${label}: %{x} responses<extra></extra>`,
    })
  );

  const chartHeight = Math.max(300, Math.min(460, rows.length * 46 + 90));

  const layout: Record<string, unknown> = {
    barmode: 'stack',
    margin: { l: 210, r: 20, t: 36, b: 44 },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.03,
      xanchor: 'right',
      x: 1,
      font: { size: 13, color: '#0B1F3A' },
    },
    xaxis: {
      title: { text: 'Responses', font: { size: 13, color: '#334155' } },
      gridcolor: '#E2E8F0',
      tickfont: { size: 12, color: '#334155' },
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 12, color: '#0B1F3A' },
    },
  };

  return (
    <PlotlyChart
      data={traces}
      layout={layout}
      height={chartHeight}
      ariaLabel="Interactive Sentiment Breakdown by Public Policy Scheme"
    />
  );
};

export const LanguageSplitChart: React.FC<{ records: FeedbackRecord[] }> = ({ records }) => {
  const rows = useMemo(() => {
    const map = new Map<string, Record<SentimentLabel, number>>();
    for (const r of records) {
      if (!map.has(r.language)) map.set(r.language, { Positive: 0, Neutral: 0, Negative: 0 });
      map.get(r.language)![r.predicted_sentiment] += 1;
    }
    return Array.from(map.entries())
      .map(([lang, counts]) => ({
        lang,
        ...counts,
        total: counts.Positive + counts.Neutral + counts.Negative,
      }))
      .sort((a, b) => b.total - a.total);
  }, [records]);

  if (rows.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-[15px] text-[#475569]">
        No language breakdown available.
      </div>
    );
  }

  const xLabels = rows.map((r) => r.lang);
  const traces: Array<Record<string, unknown>> = (['Positive', 'Neutral', 'Negative'] as SentimentLabel[]).map(
    (label) => ({
      type: 'bar',
      name: label,
      x: xLabels,
      y: rows.map((r) => r[label]),
      marker: { color: COLORS[label] },
      hovertemplate: `<b>%{x}</b><br>${label}: %{y} responses<extra></extra>`,
    })
  );

  const layout: Record<string, unknown> = {
    barmode: 'group',
    margin: { l: 48, r: 16, t: 36, b: 56 },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.03,
      xanchor: 'right',
      x: 1,
      font: { size: 13, color: '#0B1F3A' },
    },
    xaxis: {
      tickfont: { size: 13, color: '#0B1F3A' },
      linecolor: '#CBD8EC',
    },
    yaxis: {
      title: { text: 'Feedback Count', font: { size: 13, color: '#334155' } },
      gridcolor: '#E2E8F0',
      tickfont: { size: 12, color: '#334155' },
    },
  };

  return (
    <PlotlyChart
      data={traces}
      layout={layout}
      height={320}
      ariaLabel="Interactive Language Split Analysis Chart"
    />
  );
};

export const TopicFrequencyChart: React.FC<{ topics: TopicCluster[] }> = ({ topics }) => {
  if (topics.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[15px] text-[#475569]">
        No topic clusters extracted for the active filter.
      </div>
    );
  }

  const ordered = [...topics].reverse();
  const traces: Array<Record<string, unknown>> = [
    {
      type: 'bar',
      orientation: 'h',
      y: ordered.map((t) => `${t.topic_id}. ${t.label}`),
      x: ordered.map((t) => t.document_count),
      text: ordered.map((t) => `${t.document_count} (${t.share_percent}%)`),
      textposition: 'outside',
      cliponaxis: false,
      customdata: ordered.map((t) => t.keywords.join(', ')),
      marker: {
        color: '#2563EB',
        line: { color: '#163A70', width: 1 },
      },
      hovertemplate:
        '<b>%{y}</b><br>Documents: %{x}<br>Top Terms: %{customdata}<extra></extra>',
    },
  ];

  const chartHeight = Math.max(280, topics.length * 52 + 70);

  const layout: Record<string, unknown> = {
    margin: { l: 210, r: 80, t: 16, b: 44 },
    xaxis: {
      title: { text: 'Assigned Documents', font: { size: 13, color: '#334155' } },
      gridcolor: '#E2E8F0',
      tickfont: { size: 12, color: '#334155' },
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 13, color: '#0B1F3A' },
    },
  };

  return (
    <PlotlyChart
      data={traces}
      layout={layout}
      height={chartHeight}
      ariaLabel="Interactive Topic Frequency Distribution Chart"
    />
  );
};

export const ConfusionMatrixHeatmap: React.FC<{
  matrix: number[][];
  labels: SentimentLabel[];
}> = ({ matrix, labels }) => {
  const maxVal = Math.max(1, ...matrix.flat());
  const annotations: Array<Record<string, unknown>> = [];

  matrix.forEach((row, rIdx) => {
    row.forEach((val, cIdx) => {
      annotations.push({
        x: labels[cIdx],
        y: labels[rIdx],
        text: `<b>${val}</b>`,
        showarrow: false,
        font: {
          size: 16,
          family: FONT_FAMILY,
          color: val / maxVal > 0.45 ? '#FFFFFF' : '#0B1F3A',
        },
      });
    });
  });

  const traces: Array<Record<string, unknown>> = [
    {
      type: 'heatmap',
      z: matrix,
      x: labels,
      y: labels,
      colorscale: [
        [0, '#F4F7FC'],
        [0.45, '#60A5FA'],
        [1, '#0B1F3A'],
      ],
      showscale: true,
      hovertemplate: 'Actual: %{y}<br>Predicted: %{x}<br>Count: %{z}<extra></extra>',
    },
  ];

  const layout: Record<string, unknown> = {
    margin: { l: 84, r: 24, t: 20, b: 56 },
    annotations,
    xaxis: {
      title: { text: 'Predicted Label', font: { size: 13, color: '#334155' } },
      tickfont: { size: 13, color: '#0B1F3A' },
    },
    yaxis: {
      title: { text: 'Actual Ground Truth', font: { size: 13, color: '#334155' } },
      autorange: 'reversed',
      tickfont: { size: 13, color: '#0B1F3A' },
    },
  };

  return (
    <PlotlyChart
      data={traces}
      layout={layout}
      height={320}
      ariaLabel="Interactive Confusion Matrix Heatmap"
    />
  );
};
