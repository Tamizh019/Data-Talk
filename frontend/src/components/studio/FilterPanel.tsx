"use client";
import { useMemo, useCallback } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { useStudio, type ColumnMeta, type FilterValue, type MultiSelectFilter, type RangeFilter } from "@/lib/studio-context";

export default function FilterPanel() {
    const { studioData, filters, setFilter, clearAllFilters } = useStudio();
    const meta = studioData?.columnMeta ?? [];
    const activeCount = Object.keys(filters).length;

    if (!studioData || meta.length === 0) return null;

    return (
        <div
            className="flex flex-col h-full overflow-hidden transition-colors duration-300"
            style={{ background: "var(--glass-bg)", borderRight: "1px solid var(--glass-border)" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[12px] font-bold text-foreground tracking-tight">Filters</span>
                    {activeCount > 0 && (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
                            style={{ background: "#7C6FFF" }}>
                            {activeCount}
                        </span>
                    )}
                </div>
                {activeCount > 0 && (
                    <button
                        onClick={clearAllFilters}
                        className="text-[10px] font-semibold text-destructive hover:text-red-400 transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Filter Controls */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {meta.filter(m => m.type === "categorical" && (m.uniqueValues?.length ?? 0) <= 30 && (m.uniqueValues?.length ?? 0) > 1)
                    .map(m => <MultiSelectControl key={m.name} meta={m} filters={filters} setFilter={setFilter} />)}

                {meta.filter(m => m.type === "numeric")
                    .map(m => <RangeControl key={m.name} meta={m} filters={filters} setFilter={setFilter} />)}
            </div>
        </div>
    );
}

// ── MultiSelect Filter ────────────────────────────────────────────────────────
function MultiSelectControl({ meta, filters, setFilter }: {
    meta: ColumnMeta;
    filters: Record<string, FilterValue>;
    setFilter: (col: string, val: FilterValue | null) => void;
}) {
    const current = filters[meta.name] as MultiSelectFilter | undefined;
    const selected = current?.selected ?? new Set<string>();
    const values = meta.uniqueValues ?? [];

    const toggle = useCallback((v: string) => {
        const next = new Set(selected);
        if (next.has(v)) next.delete(v); else next.add(v);
        if (next.size === 0) setFilter(meta.name, null);
        else setFilter(meta.name, { type: "multiselect", selected: next });
    }, [selected, meta.name, setFilter]);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{meta.name}</span>
                {selected.size > 0 && (
                    <button onClick={() => setFilter(meta.name, null)} className="text-[9px] text-muted-foreground/60 hover:text-destructive transition-colors flex items-center gap-0.5">
                        <X className="w-2.5 h-2.5" /> Clear
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                {values.map(v => {
                    const active = selected.has(v);
                    return (
                        <button
                            key={v}
                            onClick={() => toggle(v)}
                            className="px-2 py-0.5 rounded-full text-[11px] font-medium transition-all"
                            style={{
                                background: active ? "rgba(124,111,255,0.20)" : "var(--glass-bg-hover)",
                                color: active ? "#7C6FFF" : "var(--color-muted-foreground)",
                                border: active ? "1px solid rgba(124,111,255,0.50)" : "1px solid var(--glass-border)",
                                fontWeight: active ? 700 : 400,
                            }}
                        >
                            {v}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Range Slider Filter ───────────────────────────────────────────────────────
function RangeControl({ meta, filters, setFilter }: {
    meta: ColumnMeta;
    filters: Record<string, FilterValue>;
    setFilter: (col: string, val: FilterValue | null) => void;
}) {
    const min = meta.min ?? 0;
    const max = meta.max ?? 100;
    const current = filters[meta.name] as RangeFilter | undefined;
    const currentMin = current?.currentMin ?? min;
    const currentMax = current?.currentMax ?? max;

    const update = useCallback((newMin: number, newMax: number) => {
        if (newMin === min && newMax === max) {
            setFilter(meta.name, null);
        } else {
            setFilter(meta.name, { type: "range", min, max, currentMin: newMin, currentMax: newMax });
        }
    }, [min, max, meta.name, setFilter]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{meta.name}</span>
                <span className="text-[10px] text-muted-foreground/70 font-mono">
                    {currentMin.toFixed(1)} — {currentMax.toFixed(1)}
                </span>
            </div>

            {/* Min slider */}
            <div className="relative flex flex-col gap-1">
                <input
                    type="range" min={min} max={max} step={(max - min) / 100}
                    value={currentMin}
                    onChange={e => update(Math.min(Number(e.target.value), currentMax), currentMax)}
                    className="w-full h-1 appearance-none rounded-full cursor-pointer range-slider"
                    style={{ accentColor: "#7C6FFF" }}
                />
                <input
                    type="range" min={min} max={max} step={(max - min) / 100}
                    value={currentMax}
                    onChange={e => update(currentMin, Math.max(Number(e.target.value), currentMin))}
                    className="w-full h-1 appearance-none rounded-full cursor-pointer"
                    style={{ accentColor: "#00C9B1" }}
                />
            </div>

            {current && (
                <button onClick={() => setFilter(meta.name, null)} className="text-[9px] text-muted-foreground/60 hover:text-destructive transition-colors flex items-center gap-0.5">
                    <X className="w-2.5 h-2.5" /> Reset
                </button>
            )}
        </div>
    );
}
