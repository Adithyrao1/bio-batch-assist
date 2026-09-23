import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Satellite, Layers, MapPin, Plus, Save, Trash2, Loader2, Search, X, Crosshair, Navigation, RefreshCw } from "lucide-react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getPlots, getLocations, createPlot, updatePlot, Plot, FieldLocation } from "@/lib/fieldApi";
import { fetchWithAuth } from "@/lib/api";

// Fix leaflet marker icons broken by webpack
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ---- Custom icons ----
const jumpPinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:42px;position:relative;
  ">
    <svg viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <ellipse cx="16" cy="40" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
      <path d="M16 2C9.373 2 4 7.373 4 14c0 9 12 26 12 26s12-17 12-26C28 7.373 22.627 2 16 2z" fill="#3b82f6" stroke="white" stroke-width="1.5"/>
      <circle cx="16" cy="14" r="5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -44],
});

const vertexIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;border-radius:50%;
    background:#f59e0b;border:2.5px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
    cursor:grab;
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ---- Stage colour map ----
const stageColor: Record<string, string> = {
  breeder: "#a855f7",
  foundation: "#3b82f6",
  certified: "#10b981",
  commercial: "#f59e0b",
};

// ---- Turf-lite area calc (Shoelace on sphere, in acres) ----
function polygonAreaAcres(coords: number[][]): number {
  const R = 6371000; // Earth radius metres
  const n = coords.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % n];
    area += (lng2 - lng1) * Math.PI / 180 * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
  }
  area = Math.abs(area) * R * R / 2;
  return area * 0.000247105; // m² → acres
}

function centroidOf(coords: number[][]): [number, number] {
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  return [lat, lng];
}

// ---- Drawing controller ----
interface DrawControlProps {
  drawing: boolean;
  onVertexAdd: (latlng: L.LatLng) => void;
}
function DrawControl({ drawing, onVertexAdd }: DrawControlProps) {
  useMapEvents({
    click(e) {
      if (drawing) onVertexAdd(e.latlng);
    },
  });
  return null;
}

// ---- Locate-to-plot button ----
function FlyToPlot({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { animate: true, duration: 1.2 });
  }, [position]);
  return null;
}

// ---- Nominatim result type ----
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

// ---- Geo Search Box (floats over map) ----
function GeoSearchBox({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(true);
    } catch { /* silently ignore */ }
    finally { setSearching(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (r: NominatimResult) => {
    setQuery(r.display_name.split(",").slice(0, 2).join(","));
    setOpen(false);
    setResults([]);
    onSelect(parseFloat(r.lat), parseFloat(r.lon));
  };

  const clear = () => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); };

  return (
    <div className="absolute top-3 right-3 z-[500] w-80">
      {/* Input */}
      <div className="relative flex items-center bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl overflow-hidden">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search location..."
          className="w-full pl-9 pr-8 py-2.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {searching && <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />}
        {!searching && query && (
          <button onClick={clear} className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {open && results.length > 0 && (
        <div className="mt-1.5 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl overflow-hidden">
          {results.map(r => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-xs font-medium leading-tight line-clamp-1">
                  {r.display_name.split(",").slice(0, 2).join(",")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {r.display_name.split(",").slice(2, 5).join(",")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Lat / Lng direct coordinate jumper (single Google Maps-style input) ----
function LatLngInput({ onGo }: { onGo: (lat: number, lng: number) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const parse = (raw: string): [number, number] | null => {
    // Accept "lat, lng" or "lat lng" or "lat,lng"
    const parts = raw.trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length < 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
  };

  const handleGo = () => {
    const result = parse(value);
    if (!result) {
      setError("Paste coordinates like: 27.6427, 79.9831");
      return;
    }
    setError("");
    onGo(result[0], result[1]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGo();
  };

  return (
    <div className="absolute top-16 right-3 z-[500] w-80">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Crosshair className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Jump to Coordinates</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setError(""); }}
            onKeyDown={handleKey}
            placeholder="Paste from Google Maps, e.g. 27.64, 79.98"
            className="flex-1 px-2.5 py-1.5 text-xs bg-muted/50 border border-border focus:border-blue-500 rounded-xl outline-none font-mono"
          />
          <button
            onClick={handleGo}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            <Navigation className="h-3 w-3" /> Go
          </button>
        </div>
        {error && (
          <p className="text-[10px] text-red-500 mt-1.5">{error}</p>
        )}
      </div>
    </div>
  );
}

interface PlotInfo extends Plot {
  lotId?: string;
  lotStage?: string;
  lotQty?: string;
  farmerName?: string;
  farmerCode?: string;
}

function AddPlotModal({ locations, onClose, onSave }: { locations: FieldLocation[]; onClose: () => void; onSave: (p: PlotInfo) => void }) {
  const [locationId, setLocationId] = useState("");
  const [plotNumber, setPlotNumber] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !plotNumber) { setError("Location and Plot Number are required."); return; }
    if ((lat && isNaN(parseFloat(lat))) || (lng && isNaN(parseFloat(lng)))) {
      setError("Coordinates must be valid numbers."); return;
    }
    setSaving(true);
    try {
      const created = await createPlot({
        location: parseInt(locationId),
        plot_number: plotNumber,
        area_acres: area || null,
        centroid_lat: lat ? parseFloat(lat).toFixed(7) : null,
        centroid_lng: lng ? parseFloat(lng).toFixed(7) : null,
        notes: notes
      });
      onSave(created);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2 bg-muted/50 border border-border focus:border-indigo-500 rounded-xl text-sm outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border/50 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex justify-between items-center">
          <h2 className="font-bold tracking-tight">Register New Plot</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-sm rounded-xl">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Field Location *</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)} required className={inp}>
                <option value="">— Select Location —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Plot Number *</label>
                <input value={plotNumber} onChange={e => setPlotNumber(e.target.value)} required className={inp} placeholder="e.g. A-12" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Area (Acres)</label>
                <input type="number" step="0.01" value={area} onChange={e => setArea(e.target.value)} className={inp} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                <Crosshair className="h-3 w-3 text-blue-500" /> Centroid Coordinates <span className="text-muted-foreground/60 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" step="any" value={lat}
                  onChange={e => setLat(e.target.value)}
                  className={`${inp} font-mono`} placeholder="Latitude e.g. 27.64"
                />
                <input
                  type="number" step="any" value={lng}
                  onChange={e => setLng(e.target.value)}
                  className={`${inp} font-mono`} placeholder="Longitude e.g. 79.98"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Paste from Google Maps. You can also draw a boundary to auto-calculate this.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Optional" />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-colors disabled:opacity-50 flex items-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Plot
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PlotMapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const coordsParam = searchParams.get("coords");
  const [plots, setPlots] = useState<PlotInfo[]>([]);
  const [locations, setLocations] = useState<FieldLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs for auto-opening popups
  const polygonRefs = useRef<Record<number, any>>({});
  const [autoOpenPlotId, setAutoOpenPlotId] = useState<number | null>(null);

  // Drawing state
  const [drawingFor, setDrawingFor] = useState<number | null>(null);
  const [draftVertices, setDraftVertices] = useState<[number, number][]>([]); // [lat, lng]
  const [saveError, setSaveError] = useState<string | null>(null);

  // Jump-to coordinate pin marker
  const [jumpMarker, setJumpMarker] = useState<[number, number] | null>(null);

  // Live area preview while drawing (in acres)
  const liveArea = (() => {
    if (draftVertices.length < 3) return null;
    const geoCoords = draftVertices.map(([lat, lng]) => [lng, lat]);
    return polygonAreaAcres(geoCoords);
  })();

  // Map centre
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  // Satellite vs street toggle
  const [satellite, setSatellite] = useState(true);

  // Saving indicator
  const [saving, setSaving] = useState<number | null>(null);

  // Modal state
  const [addPlotModalOpen, setAddPlotModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [plotList, locList] = await Promise.all([getPlots(), getLocations()]);
      // Fetch all seed lots to enrich plot popups, then filter for active ones locally
      const lotRes = await fetchWithAuth("/field/seed-lots/?page_size=1000");
      const lotData = await lotRes.json();
      const lots: any[] = lotData.results ?? lotData;

      // Sort lots descending so we match the most recently created lot for a plot
      const sortedLots = [...lots].sort((a, b) => b.id - a.id);

      const normalizePlot = (s?: string) => {
        if (!s) return "";
        return s.toLowerCase().replace(/^plot\s*/, '').replace(/[-\s]/g, '');
      };

      const enriched = plotList.map(p => {
        const lot = sortedLots.find(l => {
          // If commercial seed is dispatched, it's sold outside, not in the field.
          const isGrowing = l.status === "in_field" || (l.status === "dispatched" && l.stage !== "commercial");
          if (!isGrowing) return false;
          
          if (l.plot === p.id) return true;

          const lotPlot = normalizePlot(l.custom_plot_id);
          const sysPlot = normalizePlot(p.plot_number);
          if (lotPlot && sysPlot && lotPlot === sysPlot) {
            // If both have a location, they must match; if the lot has no location, match on plot ID alone
            if (!l.location || l.location === p.location) return true;
          }
          return false;
        });
        return {
          ...p,
          lotId: lot?.lot_id,
          lotStage: lot?.stage,
          lotQty: lot?.quantity_kg,
          farmerName: lot?.farmer_name,
          farmerCode: lot?.farmer_grower_code,
          lotCreatedAt: lot?.created_at,
        };
      });

      setPlots(enriched);
      setLocations(locList);

      // Auto-locate plot if passed via query params
      const pId = searchParams.get("plotId");
      const cpId = searchParams.get("customPlotId");
      const lId = searchParams.get("locationId");

      let targetPlot = null;
      if (pId) {
        targetPlot = enriched.find(p => p.id === parseInt(pId));
      } else if (cpId && lId) {
        const normCp = normalizePlot(cpId);
        targetPlot = enriched.find(p => normalizePlot(p.plot_number) === normCp && p.location === parseInt(lId));
      }

      if (targetPlot && targetPlot.centroid_lat && targetPlot.centroid_lng) {
        setFlyTo([parseFloat(targetPlot.centroid_lat), parseFloat(targetPlot.centroid_lng)]);
        setAutoOpenPlotId(targetPlot.id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (autoOpenPlotId && polygonRefs.current[autoOpenPlotId]) {
      setTimeout(() => {
        if (polygonRefs.current[autoOpenPlotId]) {
          polygonRefs.current[autoOpenPlotId].openPopup();
          setAutoOpenPlotId(null);
        }
      }, 1000); // give time for map to fly
    }
  }, [autoOpenPlotId, plots, flyTo]);

  useEffect(() => {
    if (coordsParam) {
      const parts = coordsParam.trim().split(/[\s,]+/).filter(Boolean);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setFlyTo([lat, lng]);
          setJumpMarker([lat, lng]);
        }
      }
    }
  }, [coordsParam]);

  // Convert polygon boundaries → react-leaflet positions [lat, lng][]
  const toLeaflet = (coords: number[][]): [number, number][] =>
    coords.map(([lng, lat]) => [lat, lng]);

  const handleVertexAdd = (latlng: L.LatLng) => {
    setDraftVertices(prev => [...prev, [latlng.lat, latlng.lng]]);
  };

  const cancelDraw = () => {
    setDrawingFor(null);
    setDraftVertices([]);
    setSaveError(null);
  };

  // Update a single vertex position after dragging
  const updateVertex = (index: number, latlng: L.LatLng) => {
    setDraftVertices(prev => {
      const next = [...prev];
      next[index] = [latlng.lat, latlng.lng];
      return next;
    });
  };

  // Remove a vertex by double-clicking it
  const removeVertex = (index: number) => {
    setDraftVertices(prev => prev.filter((_, i) => i !== index));
  };

  const saveBoundary = async (plotId: number) => {
    if (draftVertices.length < 3) return;
    setSaveError(null);
    setSaving(plotId);
    try {
      // GeoJSON uses [lng, lat], close the ring by appending the first point
      const ring = draftVertices.map(([lat, lng]) => [lng, lat]);
      const closedRing = [...ring, ring[0]];
      const area = polygonAreaAcres(closedRing);
      const [cLat, cLng] = centroidOf(closedRing);

      const updated = await updatePlot(plotId, {
        boundaries: { type: "Polygon", coordinates: [closedRing] },
        centroid_lat: cLat.toFixed(7),
        centroid_lng: cLng.toFixed(7),
        area_acres: String(parseFloat(area.toFixed(3))),
      });

      setPlots(prev => prev.map(p => p.id === plotId ? { ...p, ...updated } : p));
      setDrawingFor(null);
      setDraftVertices([]);
    } catch (e: any) {
      setSaveError(e?.message || "Save failed. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const clearBoundary = async (plotId: number) => {
    setSaving(plotId);
    try {
      const updated = await updatePlot(plotId, { boundaries: null, centroid_lat: null, centroid_lng: null });
      setPlots(prev => prev.map(p => p.id === plotId ? { ...p, ...updated } : p));
    } finally {
      setSaving(null);
    }
  };

  // Default map centre — India
  const defaultCenter: [number, number] = [26.8, 80.9];

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Satellite className="h-5 w-5 text-emerald-500" /> Plot Satellite Map
            </h1>
            <p className="text-xs text-muted-foreground">Draw, track and visualise all registered plots</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setAddPlotModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Plot
          </button>
          <button
            onClick={() => setSatellite(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            {satellite ? "Street View" : "Satellite View"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-72 shrink-0 bg-card border-r border-border overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plots ({plots.length})</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {plots.map(plot => (
                <div key={plot.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold">{plot.location_name}</p>
                      <p className="text-xs text-muted-foreground">Plot {plot.plot_number}</p>
                    </div>
                    {plot.lotStage && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: stageColor[plot.lotStage] ?? "#6b7280" }}
                      >
                        {plot.lotStage}
                      </span>
                    )}
                  </div>

                  {plot.area_acres && (
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Area: <span className="font-mono text-foreground">{parseFloat(plot.area_acres).toFixed(2)} acres</span>
                    </p>
                  )}

                  <div className="flex gap-1.5 flex-wrap">
                    {/* Fly to */}
                    {plot.centroid_lat && plot.centroid_lng && (
                      <button
                        onClick={() => {
                          const pos: [number, number] = [parseFloat(plot.centroid_lat!), parseFloat(plot.centroid_lng!)];
                          setFlyTo(pos);
                          setJumpMarker(pos);
                        }}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium"
                      >
                        <MapPin className="h-3 w-3" /> Locate
                      </button>
                    )}
                    {/* Draw */}
                    {drawingFor !== plot.id ? (
                      <button
                        onClick={() => {
                          setDrawingFor(plot.id);
                          setSaveError(null);
                          // Pre-populate vertices from existing boundary for drag-editing
                          if (plot.boundaries?.coordinates?.[0]) {
                            const existing = plot.boundaries.coordinates[0]
                              .slice(0, -1) // drop closing duplicate
                              .map(([lng, lat]) => [lat, lng] as [number, number]);
                            setDraftVertices(existing);
                          } else {
                            setDraftVertices([]);
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors font-medium"
                      >
                        <Plus className="h-3 w-3" /> {plot.boundaries ? "Edit Boundary" : "Draw Boundary"}
                      </button>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => saveBoundary(plot.id)}
                          disabled={draftVertices.length < 3 || saving === plot.id}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {saving === plot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save ({draftVertices.length} pts)
                        </button>
                        <button
                          onClick={cancelDraw}
                          className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {/* Clear */}
                    {plot.boundaries && drawingFor !== plot.id && (
                      <button
                        onClick={() => clearBoundary(plot.id)}
                        disabled={saving === plot.id}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors font-medium disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Live area preview while drawing */}
                  {drawingFor === plot.id && liveArea !== null && (
                    <p className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      Preview area: {liveArea.toFixed(3)} acres
                    </p>
                  )}

                  {drawingFor === plot.id && saveError && (
                    <p className="mt-1 text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-md">
                      ⚠ {saveError}
                    </p>
                  )}

                  {drawingFor === plot.id && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md">
                      {plot.boundaries
                        ? "Drag vertices to reshape. Click map to add new points. Double-click a vertex to remove it."
                        : "Click on the map to place polygon vertices. Need at least 3 points."}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{
              height: "100%",
              width: "100%",
              cursor: drawingFor !== null ? "crosshair" : "",
            }}
            className="z-0"
          >
            {/* Tile Layer */}
            {satellite ? (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles © Esri — Source: Esri, USGS, NOAA"
                maxZoom={19}
              />
            ) : (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />
            )}

            {/* Satellite label overlay (shows place names on top of imagery) */}
            {satellite && (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                opacity={0.7}
              />
            )}

            {/* Fly-to handler */}
            <FlyToPlot position={flyTo} />

            {/* Drawing controller */}
            <DrawControl drawing={drawingFor !== null} onVertexAdd={handleVertexAdd} />

            {/* Existing plot polygons */}
            {plots.map(plot => {
              if (!plot.boundaries?.coordinates?.[0]) return null;
              const positions = toLeaflet(plot.boundaries.coordinates[0]);
              const color = plot.lotStage ? stageColor[plot.lotStage] : "#6b7280";
              return (
                <Polygon
                  key={plot.id}
                  ref={(el) => {
                    if (el) {
                      polygonRefs.current[plot.id] = el;
                    }
                  }}
                  positions={positions}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[160px]">
                      <p className="font-bold text-base">{plot.location_name} — Plot {plot.plot_number}</p>
                      {plot.area_acres && (
                        <p className="text-gray-600">Area: <strong>{parseFloat(plot.area_acres).toFixed(2)} acres</strong></p>
                      )}
                      {plot.lotId && (
                        <>
                          <hr />
                          <p>Lot: <strong className="font-mono">{plot.lotId}</strong></p>
                          <p>Stage: <span style={{ color: stageColor[plot.lotStage!] }} className="font-semibold capitalize">{plot.lotStage}</span></p>
                          {plot.lotQty && <p>Quantity: <strong>{plot.lotStage === 'breeder' ? Math.round(parseFloat(plot.lotQty)).toLocaleString() : parseFloat(plot.lotQty).toLocaleString()} {plot.lotStage === 'breeder' ? 'Plantlets' : 'Quintals'}</strong></p>}
                          {plot.lotCreatedAt && (
                            <p>Registered: <strong>{new Date(plot.lotCreatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></p>
                          )}
                          {plot.farmerName && (
                            <>
                              <hr />
                              <p className="flex items-center justify-between">
                                Farmer: <span className="font-semibold">{plot.farmerName}</span>
                              </p>
                              {plot.farmerCode && (
                                <p className="flex items-center justify-between text-gray-500 text-xs mt-0.5">
                                  Code: <span className="font-mono">{plot.farmerCode}</span>
                                </p>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Draft polygon being drawn */}
            {draftVertices.length >= 2 && (
              <Polygon
                positions={draftVertices}
                pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.15, weight: 2, dashArray: "6,4" }}
              />
            )}

            {/* Draft vertex markers — draggable, double-click to remove */}
            {draftVertices.map(([lat, lng], i) => (
              <Marker
                key={`v-${i}`}
                position={[lat, lng]}
                icon={vertexIcon}
                draggable={true}
                eventHandlers={{
                  dragend(e) { updateVertex(i, (e.target as L.Marker).getLatLng()); },
                  dblclick() { removeVertex(i); },
                }}
              />
            ))}

            {/* Jump-to pin marker */}
            {jumpMarker && (
              <Marker position={jumpMarker} icon={jumpPinIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold mb-1">📍 Jumped Location</p>
                    <p className="font-mono text-xs text-gray-600">
                      {jumpMarker[0].toFixed(6)}, {jumpMarker[1].toFixed(6)}
                    </p>
                    <button
                      onClick={() => setJumpMarker(null)}
                      className="mt-2 text-xs text-red-500 hover:underline"
                    >Remove pin</button>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Drawing hint overlay */}
          {drawingFor !== null && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg pointer-events-none">
              Drawing mode — click on the map to add vertices
            </div>
          )}

          {/* Google Maps-style search box */}
          <GeoSearchBox onSelect={(lat, lng) => setFlyTo([lat, lng])} />

          {/* Lat / Lng coordinate jumper */}
          <LatLngInput onGo={(lat, lng) => { setFlyTo([lat, lng]); setJumpMarker([lat, lng]); }} />

          {/* Legend */}
          <div className="absolute bottom-4 right-4 z-[400] bg-card/90 backdrop-blur-sm border border-border rounded-xl p-3 shadow-md">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Seed Stage</p>
            {Object.entries(stageColor).map(([stage, color]) => (
              <div key={stage} className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
                <span className="text-xs capitalize font-medium">{stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {addPlotModalOpen && (
        <AddPlotModal
          locations={locations}
          onClose={() => setAddPlotModalOpen(false)}
          onSave={(p) => {
            setPlots(prev => [p, ...prev]);
            setAddPlotModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
