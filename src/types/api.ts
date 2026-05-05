// ============================================
// API Response Types
// ============================================
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================
// User Types
// ============================================
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'technician' | 'viewer';
  status: 'active' | 'inactive';
  date_joined?: string;
  profile_picture?: string | null;
}

export interface UserCreate {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: 'admin' | 'technician' | 'viewer';
}

// ============================================
// Master Data Types
// ============================================
export interface Area {
  id: number;
  name: string;
  description?: string;
}

export interface Variety {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface MediaType {
  id: number;
  name: string;
  formulation?: string;
}

export interface FindingType {
  id: number;
  name: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================
// Operational Types
// ============================================
export interface Chemical {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  mfg_date: string;
  expiry_date: string;
  received_date: string;
  remaining_stock: number;
  supplier?: string;
}

export interface ChemicalCreate {
  name: string;
  quantity: number;
  unit: string;
  mfg_date: string;
  expiry_date: string;
  received_date: string;
  remaining_stock: number;
  supplier?: string;
}

export interface MediaPreparation {
  id: number;
  batch_number: string;
  media_type: number;
  media_type_name?: string;
  prep_date: string;
  quantity: number;
  bottles_prepared: number;
  prepared_by: number;
  prepared_by_name?: string;
  contamination_notes?: string;
  bottles_issued: number;
  issued_date?: string;
}

export interface MediaPreparationCreate {
  batch_number: string;
  media_type: number;
  prep_date: string;
  quantity?: number | null;
  bottles_prepared: number;
  contamination_notes?: string;
  bottles_issued?: number;
  issued_date?: string | null;
  stock_usages?: { stock_solution: number; volume_consumed: number }[];
}

export interface ContaminationMonitoring {
  id: number;
  date_time: string;
  area: number;
  area_name?: string;
  plates_exposed: number;
  observation_datetime: string;
  colony_count: number;
  colony_type: string;
  action_taken?: string;
  recorded_by: number;
  recorded_by_name?: string;
}

export interface ContaminationMonitoringCreate {
  date_time: string;
  area: number;
  plates_exposed?: number | null;
  observation_datetime?: string | null;
  colony_count: number;
  colony_type: string;
  action_taken?: string;
}

export interface ContaminationReport {
  id: number;
  date: string;
  variety: number;
  variety_code?: string;
  source: string;
  type_desc?: string;
  bottles_affected: number;
  operator: number;
  operator_name?: string;
  notes?: string;
}

export interface ContaminationReportCreate {
  date: string;
  variety: number;
  source: string;
  type_desc?: string;
  bottles_affected: number;
  operator: number;
  notes?: string;
}

export interface InoculationRoom {
  id: number;
  date: string;
  variety: number;
  variety_code?: string;
  operator: number;
  operator_name?: string;
  cultures: number;
  bottles: number;
  total_produced: number;
  remarks?: string;
}

export interface InoculationRoomCreate {
  date: string;
  variety: number;
  operator: number;
  cultures: number;
  bottles: number;
  total_produced: number;
  remarks?: string;
}

export interface GrowthRoom {
  id: number;
  ltd_date: string;
  variety: number;
  variety_code?: string;
  planning?: string;
  opening_bottles: number;
  opening_cultures: number;
  issued_bottles: number;
  issued_cultures: number;
  received_bottles: number;
  received_cultures: number;
  contaminated_bottles: number;
  contaminated_cultures: number;
  closing_bottles: number;
  closing_cultures: number;
  recorded_by: number;
  recorded_by_name?: string;
}

export interface GrowthRoomCreate {
  ltd_date: string;
  variety: number;
  planning?: string;
  opening_bottles: number;
  opening_cultures: number;
  issued_bottles: number;
  issued_cultures: number;
  received_bottles: number;
  received_cultures: number;
  contaminated_bottles: number;
  contaminated_cultures: number;
  closing_bottles: number;
  closing_cultures: number;
  recorded_by: number;
}

export interface Greenhouse {
  id: number;
  variety: number;
  variety_code?: string;
  batch_number: string;
  transplant_date: string;
  operation_date: string;
  operation_description?: string;
  observation_date: string;
  findings: number[];
  finding_names?: string[];
  plantlets_died: number;
  recorded_by: number;
  recorded_by_name?: string;
}

export interface GreenhouseCreate {
  variety: number;
  batch_number: string;
  transplant_date: string;
  operation_date: string;
  operation_description?: string;
  observation_date: string;
  findings: number[];
  plantlets_died: number;
  recorded_by: number;
}

// ============================================
// Media–Chemical Composition & Usage Types
// ============================================
export interface MediaChemicalRequirement {
  id: number;
  media_type: number;
  media_type_name?: string;
  chemical: number;
  chemical_name?: string;
  chemical_unit?: string;
  quantity_required: number;
}

export interface MediaChemicalRequirementCreate {
  media_type: number;
  chemical: number;
  quantity_required: number;
}

export interface ChemicalUsageLog {
  id: number;
  chemical: number;
  chemical_name?: string;
  chemical_unit?: string;
  media_preparation: number;
  batch_number?: string;
  quantity_consumed: number;
  timestamp: string;
}

// ============================================
// Stock Solution Types
// ============================================
export interface StockSolution {
  id: number;
  name: string;
  description?: string;
  remaining_volume: number;
  unit: string;
}

export interface StockSolutionCreate {
  name: string;
  description?: string;
  remaining_volume?: number;
  unit?: string;
}

export interface StockSolutionChemicalUsage {
  id: number;
  chemical: number;
  chemical_name?: string;
  chemical_unit?: string;
  quantity_consumed: number;
}

export interface StockSolutionPreparation {
  id: number;
  stock_solution: number;
  stock_solution_name?: string;
  volume_prepared: number;
  prepared_by: number;
  prepared_by_name?: string;
  date: string;
  chemical_usages: StockSolutionChemicalUsage[];
}

export interface StockSolutionPreparationCreate {
  stock_solution: number;
  volume_prepared: number;
  date: string;
  chemical_usages: { chemical: number; quantity_consumed: number }[];
}

// ============================================
// Dashboard Types
// ============================================
export interface RecentActivity {
  id: number;
  user: number;
  user_name?: string;
  content: string;
  timestamp: string;
}

export interface RecentActivityCreate {
  content: string;
}

export interface DashboardStats {
  total_chemicals: number;
  expired_chemicals: number;
  total_contamination: number;
  total_production: number;
}

export interface ContaminationByArea {
  area__name: string;
  count: number;
}

export interface ProductionTrend {
  month: string;
  total: number;
}

export interface VarietyDistribution {
  variety__code: string;
  count: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  contamination_by_area: ContaminationByArea[];
  production_trend: ProductionTrend[];
  variety_distribution: VarietyDistribution[];
}
