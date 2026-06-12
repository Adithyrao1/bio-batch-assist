import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export type FilterType = "select" | "date";

export type FilterColor = "sky" | "rose" | "violet" | "amber" | "emerald" | "teal" | "orange" | "indigo" | "pink" | "cyan";

export interface FilterConfig {
  key: string;
  label: string;
  type: FilterType;
  /** For type="select" */
  options?: { value: string; label: string }[];
  placeholder?: string;
  color?: FilterColor;
}

const FILTER_COLORS: Record<FilterColor, {
  label: string;
  accent: string;
  triggerActive: string;
  chip: string;
  chipDismiss: string;
  dot: string;
}> = {
  sky: {
    label: "text-sky-600 dark:text-sky-400",
    accent: "border-l-sky-400",
    triggerActive: "border-sky-400/60 bg-sky-50/90 text-sky-700 dark:bg-sky-900/25 dark:text-sky-300 dark:border-sky-500/50",
    chip: "border-sky-300/50 bg-sky-50 text-sky-700 dark:border-sky-600/40 dark:bg-sky-900/20 dark:text-sky-300",
    chipDismiss: "hover:bg-sky-100 dark:hover:bg-sky-800/40",
    dot: "bg-sky-400",
  },
  rose: {
    label: "text-rose-600 dark:text-rose-400",
    accent: "border-l-rose-400",
    triggerActive: "border-rose-400/60 bg-rose-50/90 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-500/50",
    chip: "border-rose-300/50 bg-rose-50 text-rose-700 dark:border-rose-600/40 dark:bg-rose-900/20 dark:text-rose-300",
    chipDismiss: "hover:bg-rose-100 dark:hover:bg-rose-800/40",
    dot: "bg-rose-400",
  },
  violet: {
    label: "text-violet-600 dark:text-violet-400",
    accent: "border-l-violet-400",
    triggerActive: "border-violet-400/60 bg-violet-50/90 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-500/50",
    chip: "border-violet-300/50 bg-violet-50 text-violet-700 dark:border-violet-600/40 dark:bg-violet-900/20 dark:text-violet-300",
    chipDismiss: "hover:bg-violet-100 dark:hover:bg-violet-800/40",
    dot: "bg-violet-400",
  },
  amber: {
    label: "text-amber-600 dark:text-amber-400",
    accent: "border-l-amber-400",
    triggerActive: "border-amber-400/60 bg-amber-50/90 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-500/50",
    chip: "border-amber-300/50 bg-amber-50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300",
    chipDismiss: "hover:bg-amber-100 dark:hover:bg-amber-800/40",
    dot: "bg-amber-400",
  },
  emerald: {
    label: "text-emerald-600 dark:text-emerald-400",
    accent: "border-l-emerald-400",
    triggerActive: "border-emerald-400/60 bg-emerald-50/90 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-500/50",
    chip: "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:text-emerald-300",
    chipDismiss: "hover:bg-emerald-100 dark:hover:bg-emerald-800/40",
    dot: "bg-emerald-400",
  },
  teal: {
    label: "text-teal-600 dark:text-teal-400",
    accent: "border-l-teal-400",
    triggerActive: "border-teal-400/60 bg-teal-50/90 text-teal-700 dark:bg-teal-900/25 dark:text-teal-300 dark:border-teal-500/50",
    chip: "border-teal-300/50 bg-teal-50 text-teal-700 dark:border-teal-600/40 dark:bg-teal-900/20 dark:text-teal-300",
    chipDismiss: "hover:bg-teal-100 dark:hover:bg-teal-800/40",
    dot: "bg-teal-400",
  },
  orange: {
    label: "text-orange-600 dark:text-orange-400",
    accent: "border-l-orange-400",
    triggerActive: "border-orange-400/60 bg-orange-50/90 text-orange-700 dark:bg-orange-900/25 dark:text-orange-300 dark:border-orange-500/50",
    chip: "border-orange-300/50 bg-orange-50 text-orange-700 dark:border-orange-600/40 dark:bg-orange-900/20 dark:text-orange-300",
    chipDismiss: "hover:bg-orange-100 dark:hover:bg-orange-800/40",
    dot: "bg-orange-400",
  },
  indigo: {
    label: "text-indigo-600 dark:text-indigo-400",
    accent: "border-l-indigo-400",
    triggerActive: "border-indigo-400/60 bg-indigo-50/90 text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-300 dark:border-indigo-500/50",
    chip: "border-indigo-300/50 bg-indigo-50 text-indigo-700 dark:border-indigo-600/40 dark:bg-indigo-900/20 dark:text-indigo-300",
    chipDismiss: "hover:bg-indigo-100 dark:hover:bg-indigo-800/40",
    dot: "bg-indigo-400",
  },
  pink: {
    label: "text-pink-600 dark:text-pink-400",
    accent: "border-l-pink-400",
    triggerActive: "border-pink-400/60 bg-pink-50/90 text-pink-700 dark:bg-pink-900/25 dark:text-pink-300 dark:border-pink-500/50",
    chip: "border-pink-300/50 bg-pink-50 text-pink-700 dark:border-pink-600/40 dark:bg-pink-900/20 dark:text-pink-300",
    chipDismiss: "hover:bg-pink-100 dark:hover:bg-pink-800/40",
    dot: "bg-pink-400",
  },
  cyan: {
    label: "text-cyan-600 dark:text-cyan-400",
    accent: "border-l-cyan-400",
    triggerActive: "border-cyan-400/60 bg-cyan-50/90 text-cyan-700 dark:bg-cyan-900/25 dark:text-cyan-300 dark:border-cyan-500/50",
    chip: "border-cyan-300/50 bg-cyan-50 text-cyan-700 dark:border-cyan-600/40 dark:bg-cyan-900/20 dark:text-cyan-300",
    chipDismiss: "hover:bg-cyan-100 dark:hover:bg-cyan-800/40",
    dot: "bg-cyan-400",
  },
};

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  totalCount?: number;
  filteredCount?: number;
}

const ALL = "__all__";

/** Comma-separated multi-select encoding helpers */
function parseMulti(value: string): string[] {
  if (!value || value === ALL) return [];
  return value.split(",").filter(Boolean);
}
function encodeMulti(values: string[]): string {
  return values.join(",");
}

function getActiveFilters(filters: FilterConfig[], values: Record<string, string>) {
  return filters.filter((f) => {
    const v = values[f.key] ?? "";
    return v !== "" && v !== ALL;
  });
}

function getChipLabel(filter: FilterConfig, rawValue: string): string {
  if (filter.type === "date") return rawValue;
  const selected = parseMulti(rawValue);
  if (selected.length === 0) return "";
  if (selected.length === 1) {
    return filter.options?.find((o) => o.value === selected[0])?.label ?? selected[0];
  }
  return `${selected.length} selected`;
}

// ---------------------------------------------------------------------------
// Multi-select popover filter
// ---------------------------------------------------------------------------
function MultiSelectFilter({
  filter,
  values,
  onChange,
}: {
  filter: FilterConfig;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseMulti(values[filter.key] ?? ""), [values, filter.key]);
  const cs = filter.color ? FILTER_COLORS[filter.color] : null;
  const isActive = selected.length > 0;

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(filter.key, encodeMulti(next));
  }

  const triggerLabel =
    selected.length === 0
      ? (filter.placeholder ?? `All ${filter.label.toLowerCase()}s`)
      : selected.length === 1
        ? filter.options?.find((o) => o.value === selected[0])?.label ?? selected[0]
        : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`w-full flex items-center justify-between gap-1.5 h-8 px-2.5 rounded-md border text-sm transition-colors text-left
            ${
              isActive && cs
                ? cs.triggerActive
                : isActive
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
        >
          <span className="truncate flex-1">{triggerLabel}</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {selected.length > 1 && (
              <span className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold
                ${cs ? cs.dot + " text-white" : "bg-primary text-primary-foreground"}`}>
                {selected.length}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${filter.label.toLowerCase()}...`} className="h-8" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">No options found.</CommandEmpty>
            <CommandGroup>
              {filter.options?.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => toggle(opt.value)}
                    className="gap-2 cursor-pointer"
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors flex-shrink-0
                      ${
                        checked && cs
                          ? `${cs.dot} border-transparent`
                          : checked
                            ? "bg-primary border-primary"
                            : "border-border"
                      }`}>
                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="truncate text-sm">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-t p-1">
              <button
                onClick={() => { onChange(filter.key, ""); setOpen(false); }}
                className="w-full text-xs text-muted-foreground hover:text-destructive h-7 rounded-sm flex items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-3 w-3" /> Clear selection
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const activeFilters = getActiveFilters(filters, values);
  const activeCount = activeFilters.length;

  return (
    <div className="space-y-2 mb-5">
      {/* Trigger row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-sm font-medium transition-all duration-200 select-none
            ${open
              ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
              : activeCount > 0
                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
                : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-border hover:bg-muted/40"
            }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold
              ${open ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
              {activeCount}
            </span>
          )}
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Active filter chips */}
        <AnimatePresence>
          {activeFilters.map((f) => {
            const cs = f.color ? FILTER_COLORS[f.color] : null;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
              >
                <span className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 rounded-lg border text-sm font-medium
                  ${cs ? cs.chip : "border-primary/25 bg-primary/8 text-primary"}`}>
                  {cs && <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cs.dot}`} />}
                  <span className={`text-xs font-normal opacity-70`}>{f.label}:</span>
                  {getChipLabel(f, values[f.key])}
                  <button
                    onClick={() => onChange(f.key, "")}
                    className={`ml-0.5 h-4 w-4 inline-flex items-center justify-center rounded-md transition-colors ${cs ? cs.chipDismiss : "hover:bg-primary/20"}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Result count + clear all */}
        {(totalCount !== undefined || activeCount > 0) && (
          <div className="ml-auto flex items-center gap-2">
            {totalCount !== undefined && filteredCount !== undefined && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {activeCount > 0
                  ? <><span className="font-medium text-foreground">{filteredCount}</span> of {totalCount}</>
                  : <><span className="font-medium text-foreground">{totalCount}</span> records</>
                }
              </span>
            )}
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
              >
                <X className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expandable filter panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filters.map((filter) => {
                const cs = filter.color ? FILTER_COLORS[filter.color] : null;
                const rawValue = values[filter.key] ?? "";
                const isActive = filter.type === "select"
                  ? parseMulti(rawValue).length > 0
                  : rawValue !== "";
                return (
                  <div key={filter.key} className={`space-y-1.5 rounded-lg border-l-2 pl-3 py-0.5
                    ${cs ? cs.accent : "border-l-border/40"}`}>
                    <label className={`text-[11px] font-semibold uppercase tracking-wider
                      ${cs ? cs.label : "text-muted-foreground/70"}`}>
                      {filter.label}
                    </label>
                    {filter.type === "select" ? (
                      <MultiSelectFilter
                        filter={filter}
                        values={values}
                        onChange={onChange}
                      />
                    ) : (
                      <div className="relative">
                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          value={rawValue}
                          onChange={(e) => onChange(filter.key, e.target.value)}
                          className={`h-8 text-sm pl-8 transition-colors
                            ${isActive && cs
                              ? cs.triggerActive
                              : isActive
                                ? "border-primary/40 bg-primary/5 text-primary"
                                : "border-border/60 bg-background/60"}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              </div>

              {activeCount > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1">
                      <X className="h-3 w-3" /> Reset all filters
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
