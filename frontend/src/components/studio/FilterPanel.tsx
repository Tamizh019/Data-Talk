"use client";
/**
 * FilterPanel — Premium sidebar filter panel with search, active chips,
 * collapsible groups, and visual row count feedback.
 */
import { useMemo, useCallback, useState } from "react";
import {
    X, SlidersHorizontal, Search, ChevronDown, ChevronRight,
    Hash, Tag, RotateCcw,
} from "lucide-react";
import { useStudio, type ColumnMeta, type FilterValue, type MultiSelectFilter, type RangeFilter } from "@/lib/studio-context";

export default function FilterPanel() {
    const { studioData, filters, setFilter, clearAllFilters, filteredRows } = useStudio();
    const meta = studioData?.columnMeta ?? [];
    const activeCount = Object.keys(filters).length;
    const totalRows = studioData?.rawRows?.length ?? 0;
    const [search, setSearch] = useState("");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Build active filter chip data
    const activeFilters = useMemo(() => {
        return Object.entries(filters).map(([col, f]) => {
            if (f.type === "multiselect") {
                const vals = [...f.selected];
                return { col, label: `${col}: ${vals.length > 2 ? `${vals.slice(0, 2).join(", ")} +${vals.length - 2}` : vals.join(", ")}` };
            }
            if (f.type === "range") {
                return { col, label: `${col}: ${f.currentMin.toFixed(1)}–${f.currentMax.toFixed(1)}` };
            }
            return { col, label: col };
        });
    }, [filters]);

    // Filter columns by search
    const categoricalMeta = useMemo(() =>
        meta.filter(m => m.type === "categorical" && (m.uniqueValues?.length ?? 0) > 1 && (m.uniqueValues?.length ?? 0) <= 30)
            .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase())),
        [meta, search]);

    const numericMeta = useMemo(() =>
        meta.filter(m => m.type === "numeric")
            .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase())),
        [meta, search]);

    const toggleGroup = useCallback((group: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    }, []);

    if (!studioData || meta.length === 0) return null;

    return (
        <div
            className="flex flex-col h-full overflow-hidden transition-colors duration-300"
            style={{ background: "var(--glass-bg)", borderRight: "1px solid var(--glass-border)" }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(124,111,255,0.12)", border: "1px solid rgba(124,111,255,0.2)" }}>
                        <SlidersHorizontal className="w-3 h-3" style={{ color: "#7C6FFF" }} />
                    </div>
                    <span className="text-[12px] font-bold text-foreground tracking-tight">Filters</span>
                    {activeCount > 0 && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white" style={{ background: "#7C6FFF" }}>
                            {activeCount}
                        </span>
                    )}
                </div>
                {activeCount > 0 && (
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                        <RotateCcw className="w-2.5 h-2.5" /> Reset all
                    </button>
                )}
            </div>

            {/* ── Row count indicator ── */}
            <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-bg-hover)" }}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${totalRows > 0 ? (filteredRows.length / totalRows) * 100 : 100}%`,
                            background: activeCount > 0 ? "linear-gradient(90deg, #7C6FFF, #00C9B1)" : "rgba(124,111,255,0.3)",
                        }}
                    />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                    {activeCount > 0 ? (
                        <><span className="font-bold" style={{ color: "#7C6FFF" }}>{filteredRows.length}</span> / {totalRows}</>
                    ) : (
                        <span className="font-bold text-foreground">{totalRows}</span>
                    )} rows
                </span>
            </div>

            {/* ── Active Filter Chips ── */}
            {activeFilters.length > 0 && (
                <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-b border-border/30">
                    {activeFilters.map(af => (
                        <button
                            key={af.col}
                            onClick={() => setFilter(af.col, null)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all group"
                            style={{
                                background: "rgba(124,111,255,0.12)",
                                border: "1px solid rgba(124,111,255,0.25)",
                                color: "#7C6FFF",
                            }}
                        >
                            <span className="truncate max-w-[140px]">{af.label}</span>
                            <X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── Search ── */}
            <div className="px-3 pt-2.5 pb-1.5 shrink-0">
                <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                        type="text"
                        placeholder="Search columns…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-medium text-foreground placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:ring-1 focus:ring-[#7C6FFF]/50"
                        style={{
                            background: "var(--glass-bg-hover)",
                            border: "1px solid var(--glass-border)",
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filter Controls ── */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1" style={{ scrollbarWidth: "thin" }}>
                {/* Categorical Group */}
                {categoricalMeta.length > 0 && (
                    <div className="space-y-1.5">
                        <button
                            onClick={() => toggleGroup("categorical")}
                            className="flex items-center gap-1.5 w-full text-left px-1 py-1 rounded-md hover:bg-foreground/5 transition-colors"
                        >
                            {collapsedGroups.has("categorical") ? <ChevronRight className="w-3 h-3 text-muted-foreground/50" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/50" />}
                            <Tag className="w-3 h-3" style={{ color: "#00C9B1" }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categories</span>
                            <span className="ml-auto text-[9px] text-muted-foreground/40 font-medium">{categoricalMeta.length}</span>
                        </button>
                        {!collapsedGroups.has("categorical") && categoricalMeta.map(m => (
                            <MultiSelectControl key={m.name} meta={m} filters={filters} setFilter={setFilter} />
                        ))}
                    </div>
                )}

                {/* Numeric Group */}
                {numericMeta.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                        <button
                            onClick={() => toggleGroup("numeric")}
                            className="flex items-center gap-1.5 w-full text-left px-1 py-1 rounded-md hover:bg-foreground/5 transition-colors"
                        >
                            {collapsedGroups.has("numeric") ? <ChevronRight className="w-3 h-3 text-muted-foreground/50" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/50" />}
                            <Hash className="w-3 h-3" style={{ color: "#7C6FFF" }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Numeric</span>
                            <span className="ml-auto text-[9px] text-muted-foreground/40 font-medium">{numericMeta.length}</span>
                        </button>
                        {!collapsedGroups.has("numeric") && numericMeta.map((m, i) => (
                            <RangeControl key={m.name} meta={m} filters={filters} setFilter={setFilter} color={i % 2 === 0 ? "#7C6FFF" : "#00C9B1"} />
                        ))}
                    </div>
                )}

                {/* Empty search state */}
                {categoricalMeta.length === 0 && numericMeta.length === 0 && search && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Search className="w-5 h-5 text-muted-foreground/30 mb-2" />
                        <p className="text-[11px] text-muted-foreground">No columns match &ldquo;{search}&rdquo;</p>
                    </div>
                )}
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
    const [showAll, setShowAll] = useState(false);
    const visibleValues = showAll ? values : values.slice(0, 12);
    const hasMore = values.length > 12;

    const toggle = useCallback((v: string) => {
        const next = new Set(selected);
        if (next.has(v)) next.delete(v); else next.add(v);
        if (next.size === 0) setFilter(meta.name, null);
        else setFilter(meta.name, { type: "multiselect", selected: next });
    }, [selected, meta.name, setFilter]);

    return (
        <div className="px-1 py-1.5 rounded-lg" style={{ background: selected.size > 0 ? "rgba(124,111,255,0.04)" : "transparent" }}>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground truncate">{meta.name}</span>
                {selected.size > 0 && (
                    <button onClick={() => setFilter(meta.name, null)} className="text-[9px] text-muted-foreground/60 hover:text-red-400 transition-colors flex items-center gap-0.5">
                        <X className="w-2.5 h-2.5" /> Clear
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                {visibleValues.map(v => {
                    const active = selected.has(v);
                    return (
                        <button
                            key={v}
                            onClick={() => toggle(v)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all truncate max-w-[160px]"
                            title={v}
                            style={{
                                background: active ? "rgba(124,111,255,0.18)" : "var(--glass-bg-hover)",
                                color: active ? "#7C6FFF" : "var(--color-muted-foreground)",
                                border: active ? "1px solid rgba(124,111,255,0.45)" : "1px solid var(--glass-border)",
                                fontWeight: active ? 700 : 400,
                            }}
                        >
                            {v}
                        </button>
                    );
                })}
            </div>
            {hasMore && (
                <button
                    onClick={() => setShowAll(p => !p)}
                    className="text-[9px] mt-1.5 text-muted-foreground/50 hover:text-[#7C6FFF] transition-colors font-semibold"
                >
                    {showAll ? "Show less" : `+${values.length - 12} more`}
                </button>
            )}
        </div>
    );
}

// ── Range Slider Filter ───────────────────────────────────────────────────────
function RangeControl({ meta, filters, setFilter, color }: {
    meta: ColumnMeta;
    filters: Record<string, FilterValue>;
    setFilter: (col: string, val: FilterValue | null) => void;
    color: string;
}) {
    const min = meta.min ?? 0;
    const max = meta.max ?? 100;
    const current = filters[meta.name] as RangeFilter | undefined;
    const currentMin = current?.currentMin ?? min;
    const currentMax = current?.currentMax ?? max;
    const isActive = currentMin > min || currentMax < max;

    const update = useCallback((newMin: number, newMax: number) => {
        if (newMin === min && newMax === max) setFilter(meta.name, null);
        else setFilter(meta.name, { type: "range", min, max, currentMin: newMin, currentMax: newMax });
    }, [min, max, meta.name, setFilter]);

    const themeStyle = { "--thumb-color": color } as React.CSSProperties;

    return (
        <div className="px-1 py-1.5 rounded-lg" style={{ background: isActive ? `${color}08` : "transparent" }}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-muted-foreground">{meta.name}</span>
                <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={isActive
                        ? { background: `${color}15`, color: color }
                        : { background: "var(--glass-bg-hover)", color: "var(--color-muted-foreground)" }
                    }
                >
                    {currentMin.toFixed(min % 1 !== 0 ? 1 : 0)} – {currentMax.toFixed(min % 1 !== 0 ? 1 : 0)}
                </span>
            </div>
            {/* Dual Slider */}
            <div className="relative h-6 w-full flex items-center">
                <div className="absolute w-full h-1.5 bg-muted-foreground/15 rounded-full top-[10px]" />
                <div
                    className="absolute h-1.5 rounded-full top-[10px]"
                    style={{
                        background: color,
                        left: `${((currentMin - min) / (max - min)) * 100}%`,
                        right: `${100 - ((currentMax - min) / (max - min)) * 100}%`,
                    }}
                />
                <input
                    type="range" min={min} max={max} step={(max - min) / 100}
                    value={currentMin}
                    onChange={e => update(Math.min(Number(e.target.value), currentMax - ((max - min) / 100)), currentMax)}
                    className="dual-range"
                    style={themeStyle}
                />
                <input
                    type="range" min={min} max={max} step={(max - min) / 100}
                    value={currentMax}
                    onChange={e => update(currentMin, Math.max(Number(e.target.value), currentMin + ((max - min) / 100)))}
                    className="dual-range"
                    style={themeStyle}
                />
            </div>
            {isActive && (
                <button onClick={() => setFilter(meta.name, null)} className="text-[9px] mt-0.5 text-muted-foreground/50 hover:text-red-400 transition-colors font-semibold flex items-center gap-0.5">
                    <RotateCcw className="w-2 h-2" /> Reset
                </button>
            )}
        </div>
    );
}
