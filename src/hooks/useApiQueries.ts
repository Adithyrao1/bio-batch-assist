import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  usersApi,
  areasApi,
  varietiesApi,
  mediaTypesApi,
  findingTypesApi,
  chemicalsApi,
  mediaPreparationsApi,
  stockSolutionsApi,
  stockPreparationsApi,
  mediaChemicalRequirementsApi,
  chemicalUsageLogsApi,
  contaminationMonitoringApi,
  contaminationReportsApi,
  inoculationRoomApi,
  growthRoomApi,
  greenhouseApi,
  recentActivityApi,
  type PaginatedResponse,
  type User,
  type UserCreate,
  type Area,
  type Variety,
  type MediaType,
  type FindingType,
  type Chemical,
  type ChemicalCreate,
  type MediaPreparation,
  type MediaPreparationCreate,
  type ContaminationMonitoring,
  type ContaminationMonitoringCreate,
  type ContaminationReport,
  type ContaminationReportCreate,
  type InoculationRoom,
  type InoculationRoomCreate,
  type GrowthRoom,
  type GrowthRoomCreate,
  type Greenhouse,
  type GreenhouseCreate,
  type MediaChemicalRequirement,
  type MediaChemicalRequirementCreate,
  type ChemicalUsageLog,
  type StockSolution,
  type StockSolutionCreate,
  type StockSolutionPreparation,
  type StockSolutionPreparationCreate,
  type RecentActivityCreate,
  type DashboardResponse,
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

export function useMediaTypes(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<MediaType>>({
    queryKey: ['media-types', params],
    queryFn: () => mediaTypesApi.getAll(params),
  });
}

export function useCreateMediaType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MediaType>) => mediaTypesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-types'] }),
  });
}

export function useUpdateMediaType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MediaType> }) => 
      mediaTypesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-types'] }),
  });
}

export function useDeleteMediaType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => mediaTypesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-types'] }),
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
// MEDIA PREPARATION HOOKS
// ============================================
export function useMediaPreparations(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<MediaPreparation>>({
    queryKey: ['media-preparation', params],
    queryFn: () => mediaPreparationsApi.getAll(params),
  });
}

export function useCreateMediaPreparation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MediaPreparationCreate) => mediaPreparationsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-preparation'] }),
  });
}

export function useUpdateMediaPreparation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MediaPreparationCreate> }) => 
      mediaPreparationsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-preparation'] }),
  });
}

export function useDeleteMediaPreparation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => mediaPreparationsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-preparation'] }),
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
// MEDIA CHEMICAL REQUIREMENTS HOOKS
// ============================================
export function useMediaChemicalRequirements(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<MediaChemicalRequirement>>({
    queryKey: ['media-chemical-requirements', params],
    queryFn: () => mediaChemicalRequirementsApi.getAll(params),
  });
}

export function useMediaChemicalRequirementsByMediaType(mediaTypeId: number) {
  return useQuery<PaginatedResponse<MediaChemicalRequirement>>({
    queryKey: ['media-chemical-requirements', { media_type: mediaTypeId }],
    queryFn: () => mediaChemicalRequirementsApi.getAll({ media_type: mediaTypeId }),
    enabled: !!mediaTypeId,
  });
}

export function useCreateMediaChemicalRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MediaChemicalRequirementCreate) => mediaChemicalRequirementsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-chemical-requirements'] }),
  });
}

export function useUpdateMediaChemicalRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MediaChemicalRequirementCreate> }) =>
      mediaChemicalRequirementsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-chemical-requirements'] }),
  });
}

export function useDeleteMediaChemicalRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => mediaChemicalRequirementsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-chemical-requirements'] }),
  });
}

// ============================================
// CHEMICAL USAGE LOGS HOOKS
// ============================================
export function useChemicalUsageLogs(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<ChemicalUsageLog>>({
    queryKey: ['chemical-usage-logs', params],
    queryFn: () => chemicalUsageLogsApi.getAll(params),
  });
}

export function useChemicalUsageLogsByMediaPrep(mediaPrepId: number) {
  return useQuery<PaginatedResponse<ChemicalUsageLog>>({
    queryKey: ['chemical-usage-logs', { media_preparation: mediaPrepId }],
    queryFn: () => chemicalUsageLogsApi.getAll({ media_preparation: mediaPrepId }),
    enabled: !!mediaPrepId,
  });
}

// ============================================
// CONTAMINATION MONITORING HOOKS
// ============================================
export function useContaminationMonitoring(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<ContaminationMonitoring>>({
    queryKey: ['contamination-monitoring', params],
    queryFn: () => contaminationMonitoringApi.getAll(params),
  });
}

export function useCreateContaminationMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContaminationMonitoringCreate) => contaminationMonitoringApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contamination-monitoring'] }),
  });
}

export function useUpdateContaminationMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContaminationMonitoringCreate> }) => 
      contaminationMonitoringApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contamination-monitoring'] }),
  });
}

export function useDeleteContaminationMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contaminationMonitoringApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contamination-monitoring'] }),
  });
}

// ============================================
// CONTAMINATION REPORTS HOOKS
// ============================================
export function useContaminationReports(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<ContaminationReport>>({
    queryKey: ['contamination-reports', params],
    queryFn: () => contaminationReportsApi.getAll(params),
  });
}

export function useCreateContaminationReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContaminationReportCreate) => contaminationReportsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contamination-reports'] }),
  });
}

export function useUpdateContaminationReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContaminationReportCreate> }) => 
      contaminationReportsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contamination-reports'] }),
  });
}

export function useDeleteContaminationReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contaminationReportsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contamination-reports'] }),
  });
}

// ============================================
// INOCULATION ROOM HOOKS
// ============================================
export function useInoculationRoom(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<InoculationRoom>>({
    queryKey: ['inoculation-room', params],
    queryFn: () => inoculationRoomApi.getAll(params),
  });
}

export function useCreateInoculationRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InoculationRoomCreate) => inoculationRoomApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inoculation-room'] }),
  });
}

export function useUpdateInoculationRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InoculationRoomCreate> }) => 
      inoculationRoomApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inoculation-room'] }),
  });
}

export function useDeleteInoculationRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inoculationRoomApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inoculation-room'] }),
  });
}

// ============================================
// GROWTH ROOM HOOKS
// ============================================
export function useGrowthRoom(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<GrowthRoom>>({
    queryKey: ['growth-room', params],
    queryFn: () => growthRoomApi.getAll(params),
  });
}

export function useCreateGrowthRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GrowthRoomCreate) => growthRoomApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['growth-room'] }),
  });
}

export function useUpdateGrowthRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GrowthRoomCreate> }) => 
      growthRoomApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['growth-room'] }),
  });
}

export function useDeleteGrowthRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => growthRoomApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['growth-room'] }),
  });
}

// ============================================
// GREENHOUSE HOOKS
// ============================================
export function useGreenhouse(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<Greenhouse>>({
    queryKey: ['greenhouse', params],
    queryFn: () => greenhouseApi.getAll(params),
  });
}

export function useCreateGreenhouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GreenhouseCreate) => greenhouseApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['greenhouse'] }),
  });
}

export function useUpdateGreenhouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GreenhouseCreate> }) => 
      greenhouseApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['greenhouse'] }),
  });
}

export function useDeleteGreenhouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => greenhouseApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['greenhouse'] }),
  });
}

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
