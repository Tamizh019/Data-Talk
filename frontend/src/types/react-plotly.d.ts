// Type declaration for react-plotly.js (no official @types package)
declare module "react-plotly.js" {
    import { Component } from "react";
    interface PlotParams {
        data: Plotly.Data[];
        layout?: Partial<Plotly.Layout>;
        config?: Partial<Plotly.Config>;
        style?: React.CSSProperties;
        useResizeHandler?: boolean;
        onInitialized?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
        onUpdate?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
        onPurge?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
        onError?: (err: Error) => void;
        [key: string]: unknown;
    }
    export default class Plot extends Component<PlotParams> { }
}
