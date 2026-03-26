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
  quantity: number;
  bottles_prepared: number;
  prepared_by: number;
  contamination_notes?: string;
  bottles_issued?: number;
  issued_date?: string;
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
  plates_exposed: number;
  observation_datetime: string;
  colony_count: number;
  colony_type: string;
  action_taken?: string;
  recorded_by: number;
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
// Dashboard Types
// ============================================
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
