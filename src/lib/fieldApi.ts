import { fetchWithAuth } from "./api";

const BASE = "/field";

// ---- Types ----
export interface FieldLocation {
  id: number;
  name: string;
  location_type: "company_farm" | "contract_farm";
  district: string;
  state: string;
  notes: string;
  plot_count: number;
  created_at: string;
}

export interface Plot {
  id: number;
  location: number;
  location_name: string;
  plot_number: string;
  area_acres: string | null;
  notes: string;
  boundaries: { type: "Polygon"; coordinates: number[][][] } | null;
  centroid_lat: string | null;
  centroid_lng: string | null;
}

export interface FieldManager {
  id: number;
  name: string;
  employee_code: string | null;
  phone: string;
  email: string;
  region: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  farmer_count: number; // annotated read-only from backend
}

export interface Farmer {
  id: number;
  name: string;
  grower_code: string | null;
  village: string;
  phone: string;
  aadhar_number: string;
  primary_location: number | null;
  primary_location_name: string | null;
  field_manager: number | null;        // writable FK id
  field_manager_name: string | null;   // read-only display name
  quality_score: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  total_seeds_taken_kg: number;
  total_harvest_returned_kg: number;
  yield_ratio: number | null;
}

export interface SeedLot {
  id: number;
  lot_id: string;
  stage: "breeder" | "foundation" | "certified" | "commercial";
  parent_lot: number | null;
  parent_lot_id: string | null;
  lab_batch_reference: string;
  variety: number;
  variety_code: string;
  variety_name: string;
  quantity_kg: string;
  season_year: number;
  status: "in_field" | "harvested" | "dispatched" | "rejected";
  location: number | null;
  location_name: string | null;
  plot: number | null;
  plot_number: string | null;
  custom_plot_id: string | null;
  custom_coordinates: string | null;
  farmer: number | null;
  farmer_name: string | null;
  farmer_grower_code: string | null;
  holder_name: string;
  notes: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  child_count: number;
}

export interface SeedLotTransaction {
  id: number;
  seed_lot: number;
  lot_id: string;
  txn_type: "dispatch" | "harvest" | "status_change" | "transfer";
  quantity_kg: string | null;
  farmer: number | null;
  farmer_name: string | null;
  location: number | null;
  location_name: string | null;
  notes: string;
  recorded_by: number;
  recorded_by_name: string;
  recorded_at: string;
}

export interface LocationSummary {
  id: number;
  name: string;
  location_type: "company_farm" | "contract_farm";
  total_plots: number;
  plots_with_boundary: number;
  total_area_acres: number;
  active_lots_count: number;
  lots_by_stage: Partial<Record<"breeder" | "foundation" | "certified" | "commercial", number>>;
}

export interface FieldDashboardData {
  stage_summary: Record<string, { label: string; total_kg: number; count: number }>;
  active_farmers: number;
  total_dispatched_kg: number;
  total_harvested_kg: number;
  avg_yield_ratio: number;
  location_summary: LocationSummary[];
}

// ---- API Functions ----

// Dashboard
export const getFieldDashboard = async (): Promise<FieldDashboardData> => {
  const res = await fetchWithAuth(`${BASE}/dashboard/`);
  if (!res.ok) throw new Error("Failed to fetch field dashboard");
  return res.json();
};

// Locations
export const getLocations = async (): Promise<FieldLocation[]> => {
  const res = await fetchWithAuth(`${BASE}/locations/`);
  if (!res.ok) throw new Error("Failed to fetch locations");
  const data = await res.json();
  return data.results ?? data;
};

export const getPlots = async (location_id?: number): Promise<Plot[]> => {
  const qs = location_id ? `?location=${location_id}` : "";
  const res = await fetchWithAuth(`${BASE}/plots/${qs}`);
  if (!res.ok) throw new Error("Failed to fetch plots");
  const data = await res.json();
  return data.results ?? data;
};

export const createPlot = async (body: Partial<Plot>): Promise<Plot> => {
  const res = await fetchWithAuth(`${BASE}/plots/`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create plot");
  return res.json();
};

export const updatePlot = async (id: number, body: Partial<Plot>): Promise<Plot> => {
  const res = await fetchWithAuth(`${BASE}/plots/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to update plot");
  return res.json();
};

export const createLocation = async (body: Partial<FieldLocation>): Promise<FieldLocation> => {
  const res = await fetchWithAuth(`${BASE}/locations/`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create location");
  return res.json();
};

// Field Managers
export const getFieldManagers = async (): Promise<FieldManager[]> => {
  const res = await fetchWithAuth(`${BASE}/managers/`);
  if (!res.ok) throw new Error("Failed to fetch field managers");
  const data = await res.json();
  return data.results ?? data;
};

export const createFieldManager = async (body: Partial<FieldManager>): Promise<FieldManager> => {
  const res = await fetchWithAuth(`${BASE}/managers/`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create field manager");
  return res.json();
};

export const updateFieldManager = async (id: number, body: Partial<FieldManager>): Promise<FieldManager> => {
  const res = await fetchWithAuth(`${BASE}/managers/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to update field manager");
  return res.json();
};

// Farmers
export const getFarmers = async (): Promise<Farmer[]> => {
  const res = await fetchWithAuth(`${BASE}/farmers/`);
  if (!res.ok) throw new Error("Failed to fetch farmers");
  const data = await res.json();
  return data.results ?? data;
};

export const createFarmer = async (body: Partial<Farmer>): Promise<Farmer> => {
  const res = await fetchWithAuth(`${BASE}/farmers/`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create farmer");
  return res.json();
};

export const updateFarmer = async (id: number, body: Partial<Farmer>): Promise<Farmer> => {
  const res = await fetchWithAuth(`${BASE}/farmers/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to update farmer");
  return res.json();
};

// Seed Lots
export const getSeedLots = async (params?: Record<string, string>): Promise<{ results: SeedLot[]; count: number }> => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetchWithAuth(`${BASE}/seed-lots/${qs}`);
  if (!res.ok) throw new Error("Failed to fetch seed lots");
  const data = await res.json();
  if (data.results !== undefined) return { results: data.results, count: data.count ?? data.results.length };
  return { results: data, count: data.length };
};

export const createSeedLot = async (body: Partial<SeedLot>): Promise<SeedLot> => {
  const res = await fetchWithAuth(`${BASE}/seed-lots/`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create seed lot");
  return res.json();
};

export const updateSeedLot = async (id: number, body: Partial<SeedLot>): Promise<SeedLot> => {
  const res = await fetchWithAuth(`${BASE}/seed-lots/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to update seed lot");
  return res.json();
};

export const dispatchLot = async (
  id: number,
  body: {
    farmer_id?: number;
    quantity_kg?: number;
    notes?: string;
    new_lot_id?: string;
    location?: number;
    custom_plot_id?: string;
    custom_coordinates?: string;
  }
) => {
  const res = await fetchWithAuth(`${BASE}/seed-lots/${id}/dispatch/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to dispatch seed lot");
  return res.json();
};

export const logHarvest = async (id: number, new_lot_id: string, quantity_kg: number, notes?: string, location?: number, custom_plot_id?: string, custom_coordinates?: string) => {
  const res = await fetchWithAuth(`${BASE}/seed-lots/${id}/harvest/`, {
    method: "POST",
    body: JSON.stringify({ new_lot_id, quantity_kg, notes, location, custom_plot_id, custom_coordinates }),
  });
  if (!res.ok) throw new Error("Failed to log harvest");
  return res.json();
};

// Genealogy
export const getGenealogy = async (lot_ids: string[]): Promise<{ nodes: SeedLot[]; edges: { id: string; source: string; target: string }[] }> => {
  const res = await fetchWithAuth(`${BASE}/seed-lots/genealogy/?lot_ids=${lot_ids.join(",")}`);
  if (!res.ok) throw new Error("Failed to fetch genealogy");
  return res.json();
};

// Transactions
export const getTransactions = async (lot_id?: string): Promise<SeedLotTransaction[]> => {
  const qs = lot_id ? `?lot_id=${lot_id}` : "";
  const res = await fetchWithAuth(`${BASE}/transactions/${qs}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return data.results ?? data;
};
