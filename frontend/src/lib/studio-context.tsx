"use client";
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import type { VisualizerBlock } from "@/components/ChartRenderer";
import { v4 as uuidv4 } from "uuid";

// ── Column Metadata ────────────────────────────────────────────────────────────
export interface ColumnMeta {
    name: string;
    type: "categorical" | "numeric" | "date";
    uniqueValues?: string[];
    min?: number;
    max?: number;
}

// ── Filter Types ───────────────────────────────────────────────────────────────
export type MultiSelectFilter = { type: "multiselect"; selected: Set<string>; };
export type RangeFilter       = { type: "range"; min: number; max: number; currentMin: number; currentMax: number; };
export type DateRangeFilter   = { type: "daterange"; from: string; to: string; allFrom: string; allTo: string; };
export type FilterValue = MultiSelectFilter | RangeFilter | DateRangeFilter;

// ── Drill-Down State ───────────────────────────────────────────────────────────
export interface DrillDownState {
    column: string;
    value: string;
    rows: Record<string, any>[];
    originalSql: string;
}

// ── Query Entry (history) ──────────────────────────────────────────────────────
export interface QueryEntry {
    id: string;                         // UUID, also stored in ChatMessage.queryId
    question: string;
    sql: string;
    rawRows: Record<string, any>[];
    columns: string[];
    columnMeta: ColumnMeta[];
    charts: VisualizerBlock[];
    timestamp: number;
}

// ── Studio Input (what ChatWindow calls openStudio with) ──────────────────────
export interface StudioInput {
    question: string;
    sql: string;
    rawRows: Record<string, any>[];
    columns: string[];
    columnMeta?: ColumnMeta[];
    charts: VisualizerBlock[];
}

// ── Context Type ───────────────────────────────────────────────────────────────
interface StudioContextType {
    // Query history
    queryHistory: QueryEntry[];
    activeQueryId: string | null;
    activeEntry: QueryEntry | null;
    setActiveQueryId: (id: string) => void;

    // Derived from activeEntry
    filteredRows: Record<string, any>[];

    // Filters (reset when switching queries)
    filters: Record<string, FilterValue>;
    setFilter: (column: string, value: FilterValue | null) => void;
    clearAllFilters: () => void;
    applyClickFilter: (column: string, value: string) => void;

    // Chart type overrides per query
    activeChartType: Record<string, string>;
    setChartType: (chartIndex: number, type: string) => void;

    // Drill-down
    drilldown: DrillDownState | null;
    setDrilldown: (d: DrillDownState | null) => void;

    // Panel tabs
    activeTab: "schema" | "studio";
    setActiveTab: (t: "schema" | "studio") => void;

    // Actions
    openStudio: (input: StudioInput) => string;  // returns the new queryId

    // Legacy compat for older consumers
    isOpen: boolean;
    studioData: QueryEntry | null;
}

const StudioContext = createContext<StudioContextType | null>(null);

const LS_KEY = "datatalk_query_history";

function loadHistoryFromStorage(): QueryEntry[] {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as QueryEntry[];
    } catch { return []; }
}

function saveHistoryToStorage(history: QueryEntry[]) {
    try {
        // Cap to 10 most recent to keep localStorage lean
        localStorage.setItem(LS_KEY, JSON.stringify(history.slice(0, 10)));
    } catch { /* quota exceeded — silently skip */ }
}

export function StudioProvider({ children }: { children: ReactNode }) {
    const [queryHistory, setQueryHistory] = useState<QueryEntry[]>(() => loadHistoryFromStorage());
    const [activeQueryId, setActiveQueryIdState] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, FilterValue>>({});
    const [activeChartType, setActiveChartTypeState] = useState<Record<string, string>>({});
    const [drilldown, setDrilldownState] = useState<DrillDownState | null>(null);
    const [activeTab, setActiveTab] = useState<"schema" | "studio">("schema");

    // Keep synchronous ref for openStudio to avoid closure stale state
    const historyRef = useRef<QueryEntry[]>(loadHistoryFromStorage());
    useEffect(() => {
        historyRef.current = queryHistory;
        saveHistoryToStorage(queryHistory);   // ← persist on every change
    }, [queryHistory]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const activeEntry = useMemo(
        () => queryHistory.find(q => q.id === activeQueryId) ?? null,
        [queryHistory, activeQueryId]
    );

    const filteredRows = useMemo(() => {
        if (!activeEntry?.rawRows) return [];
        return activeEntry.rawRows.filter(row =>
            Object.entries(filters).every(([col, filter]) => {
                const val = row[col];
                if (filter.type === "multiselect") {
                    if (filter.selected.size === 0) return true;
                    return filter.selected.has(String(val ?? ""));
                }
                if (filter.type === "range") {
                    const num = Number(val);
                    return !isNaN(num) && num >= filter.currentMin && num <= filter.currentMax;
                }
                if (filter.type === "daterange") {
                    if (!val) return true;
                    const d = new Date(val).getTime();
                    return d >= new Date(filter.from).getTime() && d <= new Date(filter.to).getTime();
                }
                return true;
            })
        );
    }, [activeEntry, filters]);

    // ── Actions ───────────────────────────────────────────────────────────────

    /** Opens the studio with a new query — adds to history, returns its ID. */
    const openStudio = useCallback((input: StudioInput): string => {
        // Safe synchronous check against latest ref state
        const exists = historyRef.current.find(q => q.sql === input.sql && q.question === input.question);

        let id: string;
        if (exists) {
            id = exists.id;
        } else {
            id = uuidv4();
            const meta = input.columnMeta?.length
                ? input.columnMeta
                : generateColumnMeta(input.rawRows, input.columns);

            const entry: QueryEntry = { ...input, id, columnMeta: meta, timestamp: Date.now() };
            setQueryHistory(prev => [entry, ...prev].slice(0, 20));
        }

        // Apply all UI sync state changes completely outside the prev => callback
        setActiveQueryIdState(id);
        setFilters({});
        setActiveChartTypeState({});
        setDrilldownState(null);
        setActiveTab("studio");

        return id;
    }, []);

    /** Switch to a different query from history. */
    const setActiveQueryId = useCallback((id: string) => {
        setActiveQueryIdState(id);
        setFilters({});
        setActiveChartTypeState({});
        setDrilldownState(null);
        setActiveTab("studio");
    }, []);

    const setFilter = useCallback((column: string, value: FilterValue | null) => {
        setFilters(prev => {
            const next = { ...prev };
            if (value === null) delete next[column];
            else next[column] = value;
            return next;
        });
    }, []);

    const clearAllFilters = useCallback(() => setFilters({}), []);

    const setDrilldown = useCallback((d: DrillDownState | null) => setDrilldownState(d), []);

    const setChartType = useCallback((chartIndex: number, type: string) => {
        setActiveChartTypeState(prev => ({ ...prev, [chartIndex]: type }));
    }, []);

    const applyClickFilter = useCallback((column: string, value: string) => {
        setFilters(prev => {
            const current = prev[column];
            if (current?.type === "multiselect") {
                const next = new Set(current.selected);
                if (next.has(value)) next.delete(value);
                else next.add(value);
                if (next.size === 0) { const c = { ...prev }; delete c[column]; return c; }
                return { ...prev, [column]: { type: "multiselect", selected: next } };
            }
            return { ...prev, [column]: { type: "multiselect", selected: new Set([value]) } };
        });
    }, []);

    return (
        <StudioContext.Provider value={{
            queryHistory, activeQueryId, activeEntry,
            setActiveQueryId,
            filteredRows, filters, setFilter, clearAllFilters, applyClickFilter,
            activeChartType, setChartType,
            drilldown, setDrilldown,
            activeTab, setActiveTab,
            openStudio,
            // Legacy compat
            isOpen: activeEntry !== null,
            studioData: activeEntry,
        }}>
            {children}
        </StudioContext.Provider>
    );
}

export function useStudio() {
    const ctx = useContext(StudioContext);
    if (!ctx) throw new Error("useStudio must be inside StudioProvider");
    return ctx;
}

// ── Auto Column Meta Generator ─────────────────────────────────────────────────
function generateColumnMeta(rows: Record<string, any>[], columns: string[]): ColumnMeta[] {
    return columns.map(col => {
        const vals = rows.map(r => r[col]).filter(v => v !== null && v !== undefined);
        const numericVals = vals.map(Number).filter(n => !isNaN(n));
        if (numericVals.length === vals.length && vals.length > 0) {
            return { name: col, type: "numeric", min: Math.min(...numericVals), max: Math.max(...numericVals) };
        }
        const dateRe = /^\d{4}-\d{2}-\d{2}/;
        if (vals.length > 0 && dateRe.test(String(vals[0]))) return { name: col, type: "date" };
        const unique = [...new Set(vals.map(String))];
        return { name: col, type: "categorical", uniqueValues: unique };
    });
}
