import { useEffect, useState } from "react";
import { TreeDeciduous, Plus, Search, Loader2, X, ChevronRight, TrendingUp, Send, Leaf, ChevronLeft, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  getSeedLots, createSeedLot, updateSeedLot, dispatchLot, logHarvest,
  getFarmers, getLocations,
  SeedLot, Farmer, FieldLocation
} from "@/lib/fieldApi";
import { fetchWithAuth } from "@/lib/api";

const STAGES = ["breeder", "foundation", "certified", "commercial"] as const;
const STATUSES = ["in_field", "harvested", "dispatched", "rejected"] as const;

const stageBadge = (stage: string) => {
  switch (stage) {
    case "breeder": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "foundation": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "certified": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "commercial": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default: return "bg-gray-100 text-gray-700";
  }
};
const statusBadge = (status: string) =>
  status === "in_field" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20"
  : status === "dispatched" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20"
  : "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:border-green-500/20";

// ----- Add Lot Modal -----
function AddLotModal({ onClose, onSave, farmers, locations, varieties }: { onClose: () => void; onSave: (l: SeedLot) => void; farmers: Farmer[]; locations: FieldLocation[]; varieties: { id: number; code: string; name: string }[] }) {
  const [form, setForm] = useState({ lot_id: "", stage: "breeder", variety: "", quantity_kg: "", season_year: new Date().getFullYear().toString(), location: "", farmer: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handle = (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await createSeedLot({
        lot_id: form.lot_id,
        stage: form.stage as any,
        variety: parseInt(form.variety),
        quantity_kg: form.quantity_kg as any,
        season_year: parseInt(form.season_year),
        location: form.location ? parseInt(form.location) : undefined,
        farmer: form.farmer ? parseInt(form.farmer) : undefined,
        notes: form.notes,
      });
      onSave(saved);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title="Register New Lot" accent="bg-gradient-to-r from-indigo-500 to-violet-600" onClose={onClose}>
      {error && <ErrorBar msg={error} />}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lot ID *"><input name="lot_id" value={form.lot_id} onChange={handle} required className={inp} placeholder="e.g. BR-2026-001" /></Field>
          <Field label="Stage *">
            <select name="stage" value={form.stage} onChange={handle} className={inp}>
              {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Variety *">
            <select name="variety" value={form.variety} onChange={handle} required className={inp}>
              <option value="">— Select —</option>
              {varieties.map(v => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
            </select>
          </Field>
          <Field label="Season Year *"><input name="season_year" type="number" value={form.season_year} onChange={handle} required className={inp} /></Field>
        </div>
        <Field label={`Quantity (${form.stage === 'breeder' ? 'Plantlets' : 'Quintals'}) *`}>
          <input name="quantity_kg" type="number" step={form.stage === 'breeder' ? "1" : "0.001"} value={form.quantity_kg} onChange={handle} required className={inp} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <select name="location" value={form.location} onChange={handle} className={inp}>
              <option value="">— None —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Farmer">
            <select name="farmer" value={form.farmer} onChange={handle} className={inp}>
              <option value="">— None —</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes"><textarea name="notes" value={form.notes} onChange={handle} rows={2} className={`${inp} resize-none`} /></Field>
        <ModalButtons onClose={onClose} saving={saving} label="Register Lot" />
      </form>
    </ModalShell>
  );
}

// ----- Dispatch Modal -----
function DispatchModal({ lot, onClose, onSave, farmers, locations }: { lot: SeedLot; onClose: () => void; onSave: () => void; farmers: Farmer[]; locations: FieldLocation[] }) {
  const [farmerId, setFarmerId] = useState("");
  const [qty, setQty] = useState(lot.quantity_kg?.toString() || "");
  const [notes, setNotes] = useState("");
  
  // Fields for partial dispatch
  const [newLotId, setNewLotId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [coordinates, setCoordinates] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isPartial = parseFloat(qty) < parseFloat(lot.quantity_kg as any);
  const isCommercial = lot.stage === "commercial";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCommercial && !farmerId) { setError("Please select a farmer"); return; }
    if (!isCommercial && isPartial && !newLotId) { setError("Please provide a new Lot ID for the partial dispatch"); return; }
    
    setSaving(true);
    try {
      await dispatchLot(lot.id, {
        farmer_id: farmerId ? parseInt(farmerId) : undefined as any,
        quantity_kg: parseFloat(qty),
        notes,
        new_lot_id: newLotId || undefined,
        location: locationId ? parseInt(locationId) : undefined,
        custom_plot_id: plotId || undefined,
        custom_coordinates: coordinates || undefined,
      });
      onSave();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={isCommercial ? `Sell/Dispatch: ${lot.lot_id}` : `Dispatch: ${lot.lot_id}`} accent={isCommercial ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-blue-500 to-indigo-500"} onClose={onClose}>
      {error && <ErrorBar msg={error} />}
      <form onSubmit={submit} className="space-y-4">
        {!isCommercial && (
          <Field label="Assign to Farmer *">
            <select value={farmerId} onChange={e => setFarmerId(e.target.value)} className={inp} required>
              <option value="">— Select Farmer —</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.name} {f.grower_code ? `(${f.grower_code})` : ''} - {f.village}</option>)}
            </select>
          </Field>
        )}
        <Field label={`Quantity to Dispatch (${lot.stage === 'breeder' ? 'Plantlets' : 'Quintals'}) - Available: ${parseFloat(lot.quantity_kg as any).toLocaleString()}`}>
          <input type="number" step={lot.stage === 'breeder' ? "1" : "0.001"} max={lot.quantity_kg} value={qty} onChange={e => setQty(e.target.value)} className={inp} required />
        </Field>
        
        {!isCommercial && isPartial && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-indigo-700">Partial Dispatch Details (New Plot)</p>
            <Field label="New Lot ID *">
              <input value={newLotId} onChange={e => setNewLotId(e.target.value)} className={inp} placeholder={`e.g. ${lot.lot_id}-A`} required />
            </Field>
            <Field label="Plot Location">
              <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inp}>
                <option value="">— Select Location —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plot ID"><input value={plotId} onChange={e => setPlotId(e.target.value)} className={inp} placeholder="Optional e.g. PLOT-001" /></Field>
              <Field label="Coordinates"><input value={coordinates} onChange={e => setCoordinates(e.target.value)} className={inp} placeholder="Optional e.g. 27.6,79.9" /></Field>
            </div>
          </div>
        )}

        <Field label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder={isCommercial ? "Optional sales details" : ""} /></Field>
        <ModalButtons onClose={onClose} saving={saving} label={isCommercial ? "Mark as Sold" : "Dispatch Now"} />
      </form>
    </ModalShell>
  );
}

// ----- Edit Plot Modal -----
function EditPlotModal({ lot, onClose, onSave, locations }: { lot: SeedLot; onClose: () => void; onSave: (updated: SeedLot) => void; locations: FieldLocation[] }) {
  const [locationId, setLocationId] = useState(lot.location?.toString() || "");
  const [plotId, setPlotId] = useState(lot.custom_plot_id || lot.plot_number || "");
  const [coordinates, setCoordinates] = useState(lot.custom_coordinates || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSeedLot(lot.id, {
        location: locationId ? parseInt(locationId) : null,
        custom_plot_id: plotId || "",
        custom_coordinates: coordinates || "",
      } as any);
      onSave(updated);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Edit Plot Assignment: ${lot.lot_id}`} accent="bg-gradient-to-r from-orange-400 to-red-500" onClose={onClose}>
      {error && <ErrorBar msg={error} />}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Plot Location">
          <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inp}>
            <option value="">— None —</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plot ID"><input value={plotId} onChange={e => setPlotId(e.target.value)} className={inp} placeholder="Optional e.g. PLOT-001" /></Field>
          <Field label="Coordinates"><input value={coordinates} onChange={e => setCoordinates(e.target.value)} className={inp} placeholder="Optional e.g. 27.6,79.9" /></Field>
        </div>
        <ModalButtons onClose={onClose} saving={saving} label="Save Plot Details" />
      </form>
    </ModalShell>
  );
}

// ----- Harvest / Seed Distribute Modal -----
function HarvestModal({ lot, onClose, onSave, locations }: { lot: SeedLot; onClose: () => void; onSave: (child: SeedLot) => void; locations: FieldLocation[] }) {
  const nextStage: Record<string, string> = { breeder: "Foundation", foundation: "Certified", certified: "Commercial" };
  const [newLotId, setNewLotId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [locationId, setLocationId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) { setError("Plot Location is mandatory."); return; }
    setSaving(true);
    try {
      const child = await logHarvest(lot.id, newLotId, parseFloat(qty), notes, parseInt(locationId), plotId, coordinates);
      onSave(child);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Log Harvest / Seed Distribute from: ${lot.lot_id}`} accent="bg-gradient-to-r from-emerald-500 to-teal-500" onClose={onClose}>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/40 rounded-xl">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        This will mark <strong className="text-foreground">{lot.lot_id}</strong> as Harvested / Seed Distributed and create a new <strong className="text-foreground">{nextStage[lot.stage]}</strong> lot.
      </div>
      {error && <ErrorBar msg={error} />}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="New Child Lot ID *"><input value={newLotId} onChange={e => setNewLotId(e.target.value)} required className={inp} placeholder={`e.g. FD-${lot.season_year + 1}-001`} /></Field>
          <Field label={`Quantity (${nextStage[lot.stage] === 'Foundation' ? 'Quintals' : 'Quintals'}) *`}>
            <input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} required className={inp} />
          </Field>
        </div>
        <Field label="Plot Location *">
          <select value={locationId} onChange={e => setLocationId(e.target.value)} required className={inp}>
            <option value="">— Select Location —</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plot ID"><input value={plotId} onChange={e => setPlotId(e.target.value)} className={inp} placeholder="Optional" /></Field>
          <Field label="Coordinates"><input value={coordinates} onChange={e => setCoordinates(e.target.value)} className={inp} placeholder="Optional e.g. 27.6,79.9" /></Field>
        </div>
        <Field label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} /></Field>
        <ModalButtons onClose={onClose} saving={saving} label="Confirm Harvest / Seed Distribute" />
      </form>
    </ModalShell>
  );
}

// ----- Shared UI Helpers -----
const inp = "w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-indigo-500 rounded-xl text-sm outline-none";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>{children}</div>
);
const ErrorBar = ({ msg }: { msg: string }) => (
  <p className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{msg}</p>
);
const ModalButtons = ({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) => (
  <div className="flex gap-3 pt-2">
    <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
    <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saving ? "Saving..." : label}
    </button>
  </div>
);
const ModalShell = ({ title, accent, onClose, children }: { title: string; accent: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${accent}`} />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-xl">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  </div>
);

const PAGE_SIZE = 20;

// ----- Main Page -----
export default function SeedLotsPage() {
  const navigate = useNavigate();
  const [lots, setLots] = useState<SeedLot[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [locations, setLocations] = useState<FieldLocation[]>([]);
  const [varieties, setVarieties] = useState<{ id: number; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const [modal, setModal] = useState<"add" | "dispatch" | "harvest" | "editPlot" | null>(null);
  const [target, setTarget] = useState<SeedLot | null>(null);
  const [sortDateDir, setSortDateDir] = useState<"asc" | "desc">("desc");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), page_size: String(PAGE_SIZE) };
      if (stageFilter) params.stage = stageFilter;
      const [{ results: lotList, count }, farmerList, locList] = await Promise.all([
        getSeedLots(params),
        getFarmers(),
        getLocations(),
      ]);
      setLots(lotList);
      setTotalCount(count);
      // Fetch varieties using the secure wrapper
      const vRes = await fetchWithAuth("/varieties/");
      const vData = await vRes.json();
      setVarieties(vData.results ?? vData);
      setFarmers(farmerList);
      setLocations(locList);
    } finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [stageFilter]);
  useEffect(() => { load(page); }, [page, stageFilter]);

  // Client-side search filters and sorts the current page
  const filtered = [...lots].filter(l =>
    l.lot_id.toLowerCase().includes(search.toLowerCase()) ||
    (l.farmer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.location_name || "").toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortDateDir === "desc" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="space-y-6 relative">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-1.5 rounded-lg border border-border w-max mb-4"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seed Lots Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">Track physical seed inventory across all multiplication stages.</p>
        </div>
        <button onClick={() => setModal("add")} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Register Lot
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border/50 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search by ID, farmer, location..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-transparent focus:border-indigo-500/50 rounded-xl text-sm outline-none" />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="px-3 py-2 bg-muted/50 border border-border focus:border-indigo-500 rounded-xl text-sm outline-none">
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading lots...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <TreeDeciduous className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No seed lots found.</p>
            <p className="text-sm mt-1">Register your first Breeder seed lot to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Lot ID</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Parent</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Holder</th>
                  <th className="px-6 py-4">Year</th>
                  <th
                    className="px-6 py-4 cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => setSortDateDir(d => d === "desc" ? "asc" : "desc")}
                  >
                    Registered {sortDateDir === "desc" ? "↓" : "↑"}
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(lot => (
                  <tr key={lot.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-sm flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4 text-muted-foreground" /> {lot.lot_id}
                      {lot.child_count > 0 && <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{lot.child_count} children</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stageBadge(lot.stage)}`}>{lot.stage}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{lot.parent_lot_id || "—"}</td>
                    <td className="px-6 py-4 font-medium">
                      {lot.stage === "breeder" 
                        ? `${Math.round(parseFloat(lot.quantity_kg)).toLocaleString()} Plantlets` 
                        : `${parseFloat(lot.quantity_kg).toLocaleString()} Quintals`}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {lot.location_name ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{lot.location_name}</p>
                          {(lot.plot_number || lot.custom_plot_id) && <p className="text-muted-foreground">Plot: {lot.custom_plot_id || lot.plot_number}</p>}
                          {lot.custom_coordinates && (
                            <p>
                              <button
                                onClick={() => navigate(`/field/map?coords=${encodeURIComponent(lot.custom_coordinates!)}`)}
                                className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <MapPin className="h-3 w-3" /> {lot.custom_coordinates}
                              </button>
                            </p>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {lot.holder_name}
                      {lot.farmer_grower_code && (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {lot.farmer_grower_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{lot.season_year}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {lot.created_at ? new Date(lot.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${statusBadge(lot.status)}`}>
                        {lot.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {lot.status !== "harvested" && lot.status !== "rejected" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2.5 text-xs font-semibold bg-background hover:bg-orange-50 hover:text-orange-600 border-orange-200 shadow-sm"
                            onClick={() => { setTarget(lot); setModal("editPlot"); }}>
                            <MapPin className="w-3 h-3 mr-1" />
                            Edit Plot
                          </Button>
                        )}
                        {(lot.status === "in_field" || lot.status === "dispatched") && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2.5 text-xs font-semibold bg-background hover:bg-indigo-50 hover:text-indigo-600 border-indigo-200 shadow-sm"
                            onClick={() => {
                               if (lot.custom_coordinates) {
                                 navigate(`/field/map?coords=${encodeURIComponent(lot.custom_coordinates)}`);
                               } else if (lot.plot) {
                                 navigate(`/field/map?plotId=${lot.plot}`);
                               } else if (lot.custom_plot_id && lot.location) {
                                 navigate(`/field/map?customPlotId=${encodeURIComponent(lot.custom_plot_id)}&locationId=${lot.location}`);
                               } else {
                                 navigate(`/field/map`);
                               }
                            }}>
                            <Search className="w-3 h-3 mr-1" />
                            Locate
                          </Button>
                        )}
                        {lot.status !== "harvested" && lot.status !== "rejected" && lot.status !== "dispatched" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-3 text-xs font-semibold bg-background hover:bg-blue-50 hover:text-blue-600 border-blue-200 shadow-sm"
                            onClick={() => { setTarget(lot); setModal("dispatch"); }}>
                            <Send className="w-3 h-3 mr-1" />
                            Dispatch
                          </Button>
                        )}
                        {lot.stage !== "commercial" && (lot.status === "in_field" || lot.status === "dispatched") && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-3 text-xs font-semibold bg-background hover:bg-emerald-50 hover:text-emerald-600 border-emerald-200 shadow-sm"
                            onClick={() => { setTarget(lot); setModal("harvest"); }}>
                            <Leaf className="w-3 h-3 mr-1" />
                            Harvest / Seed Distribute
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of <span className="font-medium text-foreground">{totalCount}</span> lots
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg text-xs font-semibold border border-border bg-muted/50 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg text-xs font-semibold border border-border bg-muted/50 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        page === p
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-border bg-muted/50 hover:bg-muted"
                      }`}
                    >{p}</button>
                  )
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded-lg text-xs font-semibold border border-border bg-muted/50 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >›</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 rounded-lg text-xs font-semibold border border-border bg-muted/50 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >»</button>
            </div>
          </div>
        )}
      </div>

      {modal === "add" && (
        <AddLotModal
          onClose={() => setModal(null)}
          onSave={saved => { load(page); setModal(null); }}
          farmers={farmers} locations={locations} varieties={varieties}
        />
      )}
      {modal === "dispatch" && target && (
        <DispatchModal
          lot={target} farmers={farmers} locations={locations}
          onClose={() => { setModal(null); setTarget(null); }}
          onSave={() => { load(page); setModal(null); setTarget(null); }}
        />
      )}
      {modal === "harvest" && target && (
        <HarvestModal
          lot={target}
          locations={locations}
          onClose={() => { setModal(null); setTarget(null); }}
          onSave={() => { load(page); setModal(null); setTarget(null); }}
        />
      )}
      {modal === "editPlot" && target && (
        <EditPlotModal
          lot={target}
          locations={locations}
          onClose={() => { setModal(null); setTarget(null); }}
          onSave={(updated) => { setLots(p => p.map(l => l.id === updated.id ? updated : l)); setModal(null); setTarget(null); }}
        />
      )}
    </div>
  );
}
