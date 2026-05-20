import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  usersApi,
  areasApi,
  varietiesApi,
  findingTypesApi,
  chemicalsApi,
  stockSolutionsApi,
  stockPreparationsApi,
  stockRecipeItemsApi,
  initiationApi,
  multiplicationApi,
  rootingApi,
  hardeningApi,
  transplantationApi,
  recentActivityApi,
  expenseCategoriesApi,
  expensesApi,
  type PaginatedResponse,
  type User,
  type UserCreate,
  type Area,
  type Variety,
  type FindingType,
  type Chemical,
  type ChemicalCreate,
  type InitiationLog, type InitiationLogCreate, type MultiplicationLog, type MultiplicationLogCreate, type RootingLog, type RootingLogCreate, type HardeningLog, type HardeningLogCreate, type TransplantationLog, type TransplantationLogCreate,
  type StockSolution,
  type StockSolutionCreate,
  type StockSolutionPreparation,
  type StockSolutionPreparationCreate,
  type StockSolutionRecipeItem,
  type StockSolutionRecipeItemCreate,
  type RecentActivityCreate,
  type DashboardResponse,
  type ExpenseCategory,
  type ExpenseCategoryCreate,
  type Expense,
  type ExpenseCreate
} from '@/lib/api';

// ============================================
// DASHBOARD HOOKS
// ============================================
export function useDashboard(days: number = 30) {
  return useQuery<DashboardResponse>({
    queryKey: ['dashboard', days],
    queryFn: () => dashboardApi.getStats(days),
  });
}

// ============================================
// USER HOOKS
// ============================================
export function useUsers(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['users', params],
    queryFn: () => usersApi.getAll(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreate) => usersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserCreate> }) => 
      usersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ============================================
// MASTER DATA HOOKS
// ============================================
export function useAreas(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<Area>>({
    queryKey: ['areas', params],
    queryFn: () => areasApi.getAll(params),
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Area>) => areasApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Area> }) => 
      areasApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => areasApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
}

export function useVarieties(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<Variety>>({
    queryKey: ['varieties', params],
    queryFn: () => varietiesApi.getAll(params),
  });
}

export function useCreateVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Variety>) => varietiesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['varieties'] }),
  });
}

export function useUpdateVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Variety> }) => 
      varietiesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['varieties'] }),
  });
}

export function useDeleteVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => varietiesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['varieties'] }),
  });
}


export function useFindingTypes(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<FindingType>>({
    queryKey: ['finding-types', params],
    queryFn: () => findingTypesApi.getAll(params),
  });
}

export function useCreateFindingType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FindingType>) => findingTypesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finding-types'] }),
  });
}

export function useUpdateFindingType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FindingType> }) => 
      findingTypesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finding-types'] }),
  });
}

export function useDeleteFindingType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => findingTypesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finding-types'] }),
  });
}

// ============================================
// CHEMICALS HOOKS
// ============================================
export function useChemicals(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<Chemical>>({
    queryKey: ['chemicals', params],
    queryFn: () => chemicalsApi.getAll(params),
  });
}

export function useCreateChemical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChemicalCreate) => chemicalsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chemicals'] }),
  });
}

export function useUpdateChemical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChemicalCreate> }) => 
      chemicalsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chemicals'] }),
  });
}

export function useDeleteChemical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => chemicalsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chemicals'] }),
  });
}

export function useAdjustChemicalStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => 
      chemicalsApi.adjustStock(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chemicals'] }),
  });
}

// ============================================
// STOCK SOLUTIONS HOOKS
// ============================================
export function useStockSolutions(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<StockSolution>>({
    queryKey: ['stock-solutions', params],
    queryFn: () => stockSolutionsApi.getAll(params),
  });
}

export function useCreateStockSolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StockSolutionCreate) => stockSolutionsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-solutions'] }),
  });
}

export function useUpdateStockSolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StockSolutionCreate> }) => 
      stockSolutionsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-solutions'] }),
  });
}

export function useDeleteStockSolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockSolutionsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-solutions'] }),
  });
}

// ============================================
// STOCK PREPARATIONS HOOKS
// ============================================
export function useStockPreparations(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<StockSolutionPreparation>>({
    queryKey: ['stock-preparations', params],
    queryFn: () => stockPreparationsApi.getAll(params),
  });
}

export function useCreateStockPreparation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StockSolutionPreparationCreate) => stockPreparationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-preparations'] });
      queryClient.invalidateQueries({ queryKey: ['stock-solutions'] });
      queryClient.invalidateQueries({ queryKey: ['chemicals'] });
    },
  });
}

export function useDeleteStockPreparation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockPreparationsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-preparations'] }),
  });
}

// ============================================
// STOCK RECIPES HOOKS
// ============================================
export function useStockRecipeItems(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<StockSolutionRecipeItem>>({
    queryKey: ['stock-recipes', params],
    queryFn: () => stockRecipeItemsApi.getAll(params),
  });
}

export function useCreateStockRecipeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StockSolutionRecipeItemCreate) => stockRecipeItemsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-recipes'] }),
  });
}

export function useUpdateStockRecipeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StockSolutionRecipeItemCreate> }) =>
      stockRecipeItemsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-recipes'] }),
  });
}

export function useDeleteStockRecipeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockRecipeItemsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-recipes'] }),
  });
}

// ============================================
// DAILY PRODUCTION HOOKS
// ============================================
export function useInitiationLogs(params?: Record<string, string | number>) { return useQuery({ queryKey: ['initiation', params], queryFn: () => initiationApi.getAll(params) }); }
export function useCreateInitiationLog() { const qc = useQueryClient(); return useMutation({ mutationFn: (d: InitiationLogCreate) => initiationApi.create(d), onSuccess: () => qc.invalidateQueries({queryKey:['initiation']}) }); }

export function useMultiplicationLogs(params?: Record<string, string | number>) { return useQuery({ queryKey: ['multiplication', params], queryFn: () => multiplicationApi.getAll(params) }); }
export function useCreateMultiplicationLog() { const qc = useQueryClient(); return useMutation({ mutationFn: (d: MultiplicationLogCreate) => multiplicationApi.create(d), onSuccess: () => qc.invalidateQueries({queryKey:['multiplication']}) }); }

export function useRootingLogs(params?: Record<string, string | number>) { return useQuery({ queryKey: ['rooting', params], queryFn: () => rootingApi.getAll(params) }); }
export function useCreateRootingLog() { const qc = useQueryClient(); return useMutation({ mutationFn: (d: RootingLogCreate) => rootingApi.create(d), onSuccess: () => qc.invalidateQueries({queryKey:['rooting']}) }); }

export function useHardeningLogs(params?: Record<string, string | number>) { return useQuery({ queryKey: ['hardening', params], queryFn: () => hardeningApi.getAll(params) }); }
export function useCreateHardeningLog() { const qc = useQueryClient(); return useMutation({ mutationFn: (d: HardeningLogCreate) => hardeningApi.create(d), onSuccess: () => qc.invalidateQueries({queryKey:['hardening']}) }); }

export function useTransplantationLogs(params?: Record<string, string | number>) { return useQuery({ queryKey: ['transplantation', params], queryFn: () => transplantationApi.getAll(params) }); }
export function useCreateTransplantationLog() { const qc = useQueryClient(); return useMutation({ mutationFn: (d: TransplantationLogCreate) => transplantationApi.create(d), onSuccess: () => qc.invalidateQueries({queryKey:['transplantation']}) }); }

// ============================================
// DASHBOARD QUERIES
// ============================================
export function useRecentActivities(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['recent-activities', params],
    queryFn: () => recentActivityApi.getAll(params),
    refetchInterval: 30000, // Poll every 30 seconds for live updates
  });
}

export function useCreateRecentActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecentActivityCreate) => recentActivityApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recent-activities'] }),
  });
}

// ============================================
// EXPENSE TRACKING HOOKS
// ============================================
export function useExpenseCategories(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['expense-categories', params],
    queryFn: () => expenseCategoriesApi.getAll(params),
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCategoryCreate) => expenseCategoriesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] }),
  });
}

export function useExpenses(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesApi.getAll(params),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCreate) => expensesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
