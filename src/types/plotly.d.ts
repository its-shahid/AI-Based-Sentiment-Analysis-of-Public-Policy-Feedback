declare module 'plotly.js-dist-min' {
  const Plotly: {
    react: (
      root: HTMLElement,
      data: Array<Record<string, unknown>>,
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<HTMLElement>;
    purge: (root: HTMLElement) => void;
    Plots: {
      resize: (root: HTMLElement) => void;
    };
  };
  export default Plotly;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const workerUrl: string;
  export default workerUrl;
}
