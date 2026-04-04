declare module "plotly.js-dist-min" {
    import Plotly from "plotly.js";
    export default Plotly;
    export * from "plotly.js";
}

declare module "react-plotly.js" {
    import { Component } from "react";
    
    interface PlotParams {
        data: any[];
        layout?: any;
        config?: any;
        frames?: any[];
        style?: React.CSSProperties;
        className?: string;
        useResizeHandler?: boolean;
        onClick?: (event: any) => void;
        onHover?: (event: any) => void;
        onSelected?: (event: any) => void;
        onRelayout?: (event: any) => void;
        onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
        revision?: number;
        divId?: string;
    }
    
    class Plot extends Component<PlotParams> {}
    export default Plot;
}

declare module "react-plotly.js/factory" {
    const createPlotlyComponent: (plotly: any) => any;
    export default createPlotlyComponent;
}
