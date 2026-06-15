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
  last_login?: string | null;
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
  unit_price: number;
  supplier?: string;
  created_at?: string;
}

export interface ChemicalCreate {
  name: string;
  quantity: number;
  unit: string;
  mfg_date: string;
  expiry_date: string;
  received_date: string;
  remaining_stock: number;
  unit_price?: number;
  supplier?: string;
}


export interface InitiationLog { id: number; variety: number; variety_code?: string; technician: number; technician_name?: string; date: string; bottles_inoculated: number; contaminated_bottles: number; }
export interface InitiationLogCreate { variety: number; technician: number; date: string; bottles_inoculated: number; contaminated_bottles: number; }

export interface MultiplicationLog { id: number; variety: number; variety_code?: string; technician: number; technician_name?: string; date: string; cycle_number: number; bottles_produced: number; contaminated_bottles: number; }
export interface MultiplicationLogCreate { variety: number; technician: number; date: string; cycle_number: number; bottles_produced: number; contaminated_bottles: number; }

export interface RootingLog { id: number; variety: number; variety_code?: string; technician: number; technician_name?: string; date: string; basal_bottles: number; rooting_bottles: number; contaminated_bottles: number; }
export interface RootingLogCreate { variety: number; technician: number; date: string; basal_bottles: number; rooting_bottles: number; contaminated_bottles: number; }

export interface HardeningLog { id: number; variety: number; variety_code?: string; technician: number; technician_name?: string; date: string; seedlings_transplanted: number; seedlings_died: number; }
export interface HardeningLogCreate { variety: number; technician: number; date: string; seedlings_transplanted: number; seedlings_died: number; }

export interface TransplantationLog { id: number; variety: number; variety_code?: string; technician: number; technician_name?: string; date: string; seedlings_transplanted: number; seedlings_died: number; }
export interface TransplantationLogCreate { variety: number; technician: number; date: string; seedlings_transplanted: number; seedlings_died: number; }


// ============================================
// Stock Solution Types
// ============================================
export interface StockSolution {
  id: number;
  name: string;
  description?: string;
  base_volume: number;
  remaining_volume: number;
  unit: string;
}

export interface StockSolutionCreate {
  name: string;
  description?: string;
  base_volume?: number;
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
}

export interface StockSolutionRecipeItem {
  id: number;
  stock_solution: number;
  stock_solution_name?: string;
  chemical: number;
  chemical_name?: string;
  chemical_unit?: string;
  quantity_per_unit: number;
}

export interface StockSolutionRecipeItemCreate {
  stock_solution: number;
  chemical: number;
  quantity_per_unit: number;
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
  low_stock_chemicals: number;
  total_production: number;
  total_cost: number;
  cost_per_plantlet: number;
  overall_success_rate: number;
  total_contamination: number;
  cost_breakdown?: {
    chemicals: number;
    manpower: number;
    other: number;
  };
}

export interface DashboardResponse {
  stats: DashboardStats;
  variety_distribution: { name: string; value: number }[];
  success_rate_per_variety: { variety: string; successRate: number }[];
  production_pipeline: { stage: string; count: number }[];
  production_trend: { date: string; total: number }[];
  contamination_by_stage: { name: string; size: number }[];
  contamination_trend: { date: string; cases: number }[];
}

// ============================================
// Expense Tracking Types
// ============================================
export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
}

export interface ExpenseCategoryCreate {
  name: string;
  description?: string;
}

export interface Expense {
  id: number;
  category: number;
  category_name?: string;
  amount: number;
  date: string;
  description: string;
  invoice_reference: string;
  recorded_by: number;
  recorded_by_name?: string;
  created_at: string;
}

export interface ExpenseCreate {
  category: number;
  amount: number;
  date: string;
  description?: string;
  invoice_reference?: string;
}

// ============================================
// Manpower Expense Types
// ============================================
export interface ManpowerExpense {
  id: number;
  technician: number;
  technician_name: string;
  monthly_salary: number;
  daily_rate: number;
  notes?: string;
  recorded_by: number;
  recorded_by_name: string;
  updated_at: string;
  created_at: string;
}

export interface ManpowerExpenseCreate {
  technician: number;
  monthly_salary: number;
  notes?: string;
}

export interface ManpowerListResponse {
  results: ManpowerExpense[];
  count: number;
  total_monthly_payroll: number;
  total_daily_cost: number;
}
