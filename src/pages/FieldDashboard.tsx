import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TreeDeciduous, Users, Scale, TrendingUp, Loader2, MapPin, LayoutGrid, Ruler, Sprout, ChevronRight } from "lucide-react";
import { getFieldDashboard, getFarmers, FieldDashboardData, Farmer, LocationSummary } from "@/lib/fieldApi";

const stageColor: Record<string, string> = {
  breeder: "#a855f7",
  foundation: "#3b82f6",
  certified: "#10b981",
  commercial: "#f59e0b",
};

const stageBg: Record<string, string> = {
  breeder: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  foundation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  certified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  commercial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function FieldDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<FieldDashboardData | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, farmerList] = await Promise.all([getFieldDashboard(), getFarmers()]);
        setData(dash);
        setFarmers(farmerList);
      } catch (e: any) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading field data...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 font-medium p-4">{error}</div>;
  }

  const stageSummary = data?.stage_summary || {};
  const stages = [
    { key: "breeder", color: "bg-purple-500", textColor: "text-purple-600 dark:text-purple-400" },
    { key: "foundation", color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
    { key: "certified", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
    { key: "commercial", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  ];

  const maxStageKg = Math.max(...stages.map(s => stageSummary[s.key]?.total_kg || 0), 1);

  const topFarmers = [...farmers]
    .filter(f => f.yield_ratio !== null)
    .sort((a, b) => (b.yield_ratio ?? 0) - (a.yield_ratio ?? 0))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>

        <h1 className="text-2xl font-bold tracking-tight">Field Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Live metrics from the seed multiplication program.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <TreeDeciduous className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-muted-foreground">Active in Field</h3>
          </div>
          <p className="text-2xl font-bold">
            {(data?.total_dispatched_kg || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Quintals</span>
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-muted-foreground">Total Harvested</h3>
          </div>
          <p className="text-2xl font-bold">
            {(data?.total_harvested_kg || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Quintals</span>
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-muted-foreground">Farmers with Active Lots</h3>
          </div>
          <p className="text-2xl font-bold">{data?.active_farmers || 0}</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-muted-foreground">Avg Yield Ratio</h3>
          </div>
          <p className="text-2xl font-bold">
            {data?.avg_yield_ratio || 0}<span className="text-sm font-normal text-muted-foreground">x</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* Seed Stage Distribution */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-5">Seed Stage Distribution</h3>
          <div className="space-y-5">
            {stages.map(({ key, color, textColor }) => {
              const info = stageSummary[key];
              const totalKg = info?.total_kg || 0;
              const percentage = (totalKg / maxStageKg) * 100;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={`font-medium ${textColor}`}>{info?.label || key}</span>
                    <span className="font-bold">{totalKg.toLocaleString()} kg</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${Math.max(percentage, totalKg > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{info?.count || 0} lots</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Farmers */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-5">Top Performing Farmers</h3>
          {topFarmers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No farmer data yet. Add farmers and log dispatches to see rankings.</div>
          ) : (
            <div className="space-y-4">
              {topFarmers.map((farmer, idx) => (
                <div key={farmer.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{farmer.name}</p>
                      <p className="text-xs text-muted-foreground">{farmer.village}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{farmer.yield_ratio}x</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Yield</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Plot Tracking by Location ── */}
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-4">Plot Tracking by Location</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(data?.location_summary ?? []).map((loc: LocationSummary) => {
            const boundaryPct = loc.total_plots > 0
              ? Math.round((loc.plots_with_boundary / loc.total_plots) * 100)
              : 0;
            const stages = Object.entries(loc.lots_by_stage) as [string, number][];
            return (
              <div
                key={loc.id}
                className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-bold text-base leading-tight">{loc.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/field/map")}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    View Map <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-muted/40 rounded-xl">
                    <LayoutGrid className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{loc.total_plots}</p>
                    <p className="text-[10px] text-muted-foreground">Plots</p>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded-xl">
                    <Ruler className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{loc.total_area_acres > 0 ? loc.total_area_acres.toFixed(1) : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Acres</p>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded-xl">
                    <Sprout className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{loc.active_lots_count}</p>
                    <p className="text-[10px] text-muted-foreground">Active Lots</p>
                  </div>
                </div>

                {/* Boundary coverage bar */}
                {loc.total_plots > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Boundary mapped</span>
                      <span className="font-semibold">{loc.plots_with_boundary}/{loc.total_plots}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${boundaryPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stage pills */}
                {stages.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {stages.map(([stage, count]) => (
                      <span
                        key={stage}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageBg[stage]}`}
                      >
                        {count} {stage}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No active lots at this location</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
