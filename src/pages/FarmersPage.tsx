import { useEffect, useState } from "react";
import { Users, Plus, Star, Loader2, X, Phone, MapPin, ChevronLeft, UserCheck, Mail, Building2, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getFarmers, createFarmer, updateFarmer,
  getFieldManagers, createFieldManager, updateFieldManager,
  getLocations, Farmer, FieldManager, FieldLocation,
} from "@/lib/fieldApi";
import { HierarchyTree } from "@/components/HierarchyTree";

// ─── Farmer Modal ────────────────────────────────────────────────────────────
function FarmerModal({ onClose, onSave, initial, locations, managers }: {
  onClose: () => void; onSave: (f: Farmer) => void;
  initial?: Farmer | null; locations: FieldLocation[]; managers: FieldManager[];
}) {
  const [form, setForm] = useState({
    name: initial?.name || "", grower_code: initial?.grower_code || "",
    village: initial?.village || "", phone: initial?.phone || "",
    aadhar_number: initial?.aadhar_number || "",
    primary_location: initial?.primary_location?.toString() || "",
    field_manager: initial?.field_manager?.toString() || "",
    quality_score: initial?.quality_score || "0.0",
    notes: initial?.notes || "", is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const payload: Partial<Farmer> = {
        ...form,
        primary_location: form.primary_location ? parseInt(form.primary_location) : null,
        field_manager: form.field_manager ? parseInt(form.field_manager) : null,
        quality_score: String(parseFloat(form.quality_score)),
      };
      const saved = initial ? await updateFarmer(initial.id, payload) : await createFarmer(payload);
      onSave(saved);
    } catch (e: any) { setError(e.message || "Save failed"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-xl">{initial ? "Edit Farmer" : "Add Farmer"}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          {error && <p className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{error}</p>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
                <input name="name" value={form.name} onChange={handle} required className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grower Code</label>
                <input name="grower_code" value={form.grower_code || ""} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none" placeholder="GC-1234" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Village *</label>
                <input name="village" value={form.village} onChange={handle} required className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
                <input name="phone" value={form.phone} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none" /></div>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field Manager</label>
              <select name="field_manager" value={form.field_manager} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none">
                <option value="">— Unassigned —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}{m.employee_code ? ` (${m.employee_code})` : ""}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Location</label>
              <select name="primary_location" value={form.primary_location} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none">
                <option value="">— None —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quality Score (0-10)</label>
              <input name="quality_score" type="number" step="0.1" min="0" max="10" value={form.quality_score} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handle} rows={2} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-emerald-500 rounded-xl text-sm outline-none resize-none" /></div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" name="is_active" id="is_active_f" checked={form.is_active} onChange={handle} className="h-4 w-4 rounded" />
              <label htmlFor="is_active_f" className="text-sm font-medium">Active Contract</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : "Save Farmer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Field Manager Modal ──────────────────────────────────────────────────────
function FieldManagerModal({ onClose, onSave, initial }: {
  onClose: () => void; onSave: (m: FieldManager) => void; initial?: FieldManager | null;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "", employee_code: initial?.employee_code || "",
    phone: initial?.phone || "", email: initial?.email || "",
    region: initial?.region || "", notes: initial?.notes || "",
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const saved = initial ? await updateFieldManager(initial.id, form) : await createFieldManager(form);
      onSave(saved);
    } catch (e: any) { setError(e.message || "Save failed"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-xl">{initial ? "Edit Field Manager" : "Add Field Manager"}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          {error && <p className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{error}</p>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
                <input name="name" value={form.name} onChange={handle} required className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee Code</label>
                <input name="employee_code" value={form.employee_code || ""} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none" placeholder="FM-001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
                <input name="phone" value={form.phone} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                <input name="email" type="email" value={form.email} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none" /></div>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region / Territory</label>
              <input name="region" value={form.region} onChange={handle} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none" placeholder="e.g. Telangana Zone" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handle} rows={2} className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border focus:border-sky-500 rounded-xl text-sm outline-none resize-none" /></div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" name="is_active" id="is_active_m" checked={form.is_active} onChange={handle} className="h-4 w-4 rounded" />
              <label htmlFor="is_active_m" className="text-sm font-medium">Active</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : "Save Manager"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
type Tab = "farmers" | "managers" | "tree";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FarmersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("farmers");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [managers, setManagers] = useState<FieldManager[]>([]);
  const [locations, setLocations] = useState<FieldLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);
  const [editManager, setEditManager] = useState<FieldManager | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [fl, ml, ll] = await Promise.all([getFarmers(), getFieldManagers(), getLocations()]);
      setFarmers(fl); setManagers(ml); setLocations(ll);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleFarmerSave = (saved: Farmer) => {
    setFarmers(p => p.find(f => f.id === saved.id) ? p.map(f => f.id === saved.id ? saved : f) : [saved, ...p]);
    setShowFarmerModal(false); setEditFarmer(null);
  };

  const handleManagerSave = (saved: FieldManager) => {
    setManagers(p => p.find(m => m.id === saved.id) ? p.map(m => m.id === saved.id ? saved : m) : [saved, ...p]);
    setShowManagerModal(false); setEditManager(null);
    // Reload farmers so manager names refresh
    getFarmers().then(setFarmers);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "farmers", label: "Farmers", icon: <Users className="h-4 w-4" /> },
    { key: "managers", label: "Field Managers", icon: <UserCheck className="h-4 w-4" /> },
    { key: "tree", label: "Hierarchy Tree", icon: <Network className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-1.5 rounded-lg border border-border w-max">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farmers &amp; Field Managers</h1>
          <p className="text-muted-foreground text-sm mt-1">Directory and hierarchy of the seed multiplication program.</p>
        </div>
        {tab === "farmers" && (
          <button onClick={() => { setEditFarmer(null); setShowFarmerModal(true); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add Farmer
          </button>
        )}
        {tab === "managers" && (
          <button onClick={() => { setEditManager(null); setShowManagerModal(true); }}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add Field Manager
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-background shadow-sm text-foreground border border-border/60" : "text-muted-foreground hover:text-foreground"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          {/* ── Farmers Tab ── */}
          {tab === "farmers" && (
            farmers.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No farmers yet.</p>
                <p className="text-sm mt-1">Add your first contract farmer to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {farmers.map(farmer => (
                  <div key={farmer.id} onClick={() => { setEditFarmer(farmer); setShowFarmerModal(true); }}
                    className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                        {farmer.name.charAt(0)}
                      </div>
                      <div className="flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md text-xs font-bold">
                        <Star className="h-3 w-3 fill-current" />{farmer.quality_score}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{farmer.name}</h3>
                    {farmer.grower_code && (
                      <div className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded w-max mb-2">{farmer.grower_code}</div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <MapPin className="h-3 w-3" />{farmer.village}
                    </div>
                    {farmer.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Phone className="h-3 w-3" />{farmer.phone}
                      </div>
                    )}
                    {/* Manager badge */}
                    <div className={`flex items-center gap-1 text-xs mb-3 ${farmer.field_manager_name ? "text-sky-600 dark:text-sky-400" : "text-amber-500"}`}>
                      <UserCheck className="h-3 w-3" />
                      {farmer.field_manager_name ?? "Unassigned"}
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Yield Ratio</p>
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {farmer.yield_ratio !== null ? `${farmer.yield_ratio}x` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Harvest</p>
                        <p className="font-mono font-bold">{farmer.total_harvest_returned_kg.toLocaleString()} kg</p>
                      </div>
                    </div>
                    {!farmer.is_active && (
                      <div className="mt-2 text-center text-xs text-muted-foreground bg-muted rounded-lg py-1">Inactive</div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Field Managers Tab ── */}
          {tab === "managers" && (
            managers.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No field managers yet.</p>
                <p className="text-sm mt-1">Add your first field manager to start mapping the hierarchy.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map(mgr => (
                  <div key={mgr.id} onClick={() => { setEditManager(mgr); setShowManagerModal(true); }}
                    className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
                        {mgr.name.charAt(0)}
                      </div>
                      <div className="flex items-center gap-1 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 px-2 py-1 rounded-md text-xs font-bold">
                        <Users className="h-3 w-3" />{mgr.farmer_count} farmers
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{mgr.name}</h3>
                    {mgr.employee_code && (
                      <div className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded w-max mb-2">{mgr.employee_code}</div>
                    )}
                    {mgr.region && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Building2 className="h-3 w-3" />{mgr.region}
                      </div>
                    )}
                    {mgr.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Phone className="h-3 w-3" />{mgr.phone}
                      </div>
                    )}
                    {mgr.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <Mail className="h-3 w-3" />{mgr.email}
                      </div>
                    )}
                    {!mgr.is_active && (
                      <div className="mt-2 text-center text-xs text-muted-foreground bg-muted rounded-lg py-1">Inactive</div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Hierarchy Tree Tab ── */}
          {tab === "tree" && (
            <HierarchyTree managers={managers} farmers={farmers} />
          )}
        </>
      )}

      {/* Modals */}
      {showFarmerModal && (
        <FarmerModal onClose={() => { setShowFarmerModal(false); setEditFarmer(null); }}
          onSave={handleFarmerSave} initial={editFarmer} locations={locations} managers={managers} />
      )}
      {showManagerModal && (
        <FieldManagerModal onClose={() => { setShowManagerModal(false); setEditManager(null); }}
          onSave={handleManagerSave} initial={editManager} />
      )}
    </div>
  );
}
