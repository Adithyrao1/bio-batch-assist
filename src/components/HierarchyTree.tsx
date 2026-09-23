import { useState } from "react";
import { ChevronDown, ChevronRight, Users, UserCheck, MapPin, Star, AlertTriangle } from "lucide-react";
import { FieldManager, Farmer } from "@/lib/fieldApi";
import { cn } from "@/lib/utils";

const MANAGER_COLORS = [
  "border-sky-500/40 bg-sky-500/5",
  "border-violet-500/40 bg-violet-500/5",
  "border-emerald-500/40 bg-emerald-500/5",
  "border-amber-500/40 bg-amber-500/5",
  "border-rose-500/40 bg-rose-500/5",
  "border-teal-500/40 bg-teal-500/5",
];
const ICON_COLORS = [
  "bg-sky-500/10 text-sky-500",
  "bg-violet-500/10 text-violet-500",
  "bg-emerald-500/10 text-emerald-500",
  "bg-amber-500/10 text-amber-500",
  "bg-rose-500/10 text-rose-500",
  "bg-teal-500/10 text-teal-500",
];

function FarmerLeaf({ farmer }: { farmer: Farmer }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
          {farmer.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-sm">{farmer.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {farmer.grower_code && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{farmer.grower_code}</span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />{farmer.village}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {farmer.yield_ratio !== null && (
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
            <Star className="h-3 w-3 fill-current" />{farmer.yield_ratio}x
          </div>
        )}
        <div className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", farmer.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
          {farmer.is_active ? "Active" : "Inactive"}
        </div>
      </div>
    </div>
  );
}

function ManagerNode({ manager, farmers, colorIdx, defaultOpen }: { manager: FieldManager; farmers: Farmer[]; colorIdx: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden", MANAGER_COLORS[colorIdx % MANAGER_COLORS.length])}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0", ICON_COLORS[colorIdx % ICON_COLORS.length])}>
            {manager.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-base">{manager.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {manager.employee_code && <span className="text-xs font-mono text-muted-foreground">{manager.employee_code}</span>}
              {manager.region && <span className="text-xs text-muted-foreground">{manager.region}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-background/60 border border-border/60 rounded-lg px-3 py-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">{farmers.length}</span>
            <span className="text-xs text-muted-foreground">farmer{farmers.length !== 1 ? "s" : ""}</span>
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {farmers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No farmers assigned to this manager yet.</p>
          ) : (
            farmers.map(f => <FarmerLeaf key={f.id} farmer={f} />)
          )}
        </div>
      )}
    </div>
  );
}

export function HierarchyTree({ managers, farmers }: { managers: FieldManager[]; farmers: Farmer[] }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const filteredManagers = managers.filter(m =>
    !q || m.name.toLowerCase().includes(q) || (m.region || "").toLowerCase().includes(q) ||
    farmers.some(f => f.field_manager === m.id && (f.name.toLowerCase().includes(q) || f.village.toLowerCase().includes(q)))
  );

  const unassigned = farmers.filter(f => !f.field_manager && (!q || f.name.toLowerCase().includes(q) || f.village.toLowerCase().includes(q)));

  const farmersFor = (mgr: FieldManager) => {
    const list = farmers.filter(f => f.field_manager === mgr.id);
    return q ? list.filter(f => f.name.toLowerCase().includes(q) || f.village.toLowerCase().includes(q) || mgr.name.toLowerCase().includes(q)) : list;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border/60 rounded-xl">
        <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by manager name, farmer name, or region…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-3">
        {filteredManagers.map((mgr, idx) => (
          <ManagerNode key={mgr.id} manager={mgr} farmers={farmersFor(mgr)} colorIdx={idx} defaultOpen={managers.length <= 4} />
        ))}
      </div>

      {unassigned.length > 0 && (
        <UnassignedNode farmers={unassigned} />
      )}

      {filteredManagers.length === 0 && unassigned.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No results match your search.</p>
        </div>
      )}
    </div>
  );
}

function UnassignedNode({ farmers }: { farmers: Farmer[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-base text-amber-600 dark:text-amber-400">Unassigned Farmers</p>
            <p className="text-xs text-muted-foreground mt-0.5">Not mapped to any field manager</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-1.5 text-sm font-bold">{farmers.length}</div>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {farmers.map(f => <FarmerLeaf key={f.id} farmer={f} />)}
        </div>
      )}
    </div>
  );
}
