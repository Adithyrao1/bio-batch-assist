import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useVarieties, useUsers,
  useInitiationLogs, useCreateInitiationLog,
  useMultiplicationLogs, useCreateMultiplicationLog,
  useRootingLogs, useCreateRootingLog,
  useHardeningLogs, useCreateHardeningLog,
  useTransplantationLogs, useCreateTransplantationLog
} from "@/hooks/useApiQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, Plus, Loader2, Bug, AlertTriangle, ChevronDown, ChevronUp, Download, ChevronRight, FileSpreadsheet } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";

const STAGES = [
  { id: "initiation",     label: "Initiation" },
  { id: "multiplication", label: "Multiplication" },
  { id: "rooting",        label: "Rooting" },
  { id: "hardening",      label: "Hardening" },
  { id: "transplantation",label: "Transplantation" },
];

function useStageFilters(allRecords: any[]) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const varietyOptions = useMemo(() => Array.from(new Set(allRecords.map(r => r.variety_code).filter(Boolean))) as string[], [allRecords]);
  const techOptions = useMemo(() => Array.from(new Set(allRecords.map(r => r.technician_name).filter(Boolean))) as string[], [allRecords]);

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "variety", label: "Variety", type: "select", color: "emerald", options: varietyOptions.map(v => ({ value: v, label: v })) },
    { key: "technician", label: "Technician", type: "select", color: "sky", options: techOptions.map(t => ({ value: t, label: t })) },
    { key: "dateFrom", label: "Date From", type: "date", color: "amber" },
    { key: "dateTo", label: "Date To", type: "date", color: "orange" },
  ], [varietyOptions, techOptions]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const filteredData = useMemo(() => {
    const { variety, technician, dateFrom, dateTo } = filterValues;
    const varieties = variety ? variety.split(",") : [];
    const techs = technician ? technician.split(",") : [];
    return allRecords.filter((r: any) => {
      if (varieties.length > 0 && !varieties.includes(r.variety_code)) return false;
      if (techs.length > 0 && !techs.includes(r.technician_name)) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [allRecords, filterValues]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredData, page]);

  return { 
    filterValues, setFilterValues, filterConfigs, filteredData, paginatedData,
    page, setPage, totalPages: Math.ceil(filteredData.length / itemsPerPage)
  };
}

export default function DailyProduction() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("stage") || "initiation";
  const setActiveTab = (tab: string) => setSearchParams({ stage: tab });
  const { data: varieties } = useVarieties();
  const { data: users } = useUsers();

  const [isDownloading, setIsDownloading] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const { toast } = useToast();

  const [exportFilters, setExportFilters] = useState<Record<string, string>>(() => {
    const d = new Date();
    d.setDate(1);
    return {
      dateFrom: d.toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    };
  });

  const exportConfigs: FilterConfig[] = useMemo(() => [
    {
      key: "technician",
      label: "Technician",
      type: "select",
      color: "sky",
      options: users?.results?.filter(u => u.role !== 'viewer').map(u => ({
        value: u.id.toString(),
        label: u.first_name ? `${u.first_name} ${u.last_name}` : u.username
      })) || []
    },
    {
      key: "variety",
      label: "Variety",
      type: "select",
      color: "emerald",
      options: varieties?.results?.map(v => ({
        value: v.id.toString(),
        label: v.code
      })) || []
    },
    { key: "dateFrom", label: "Start Date", type: "date", color: "amber" },
    { key: "dateTo", label: "End Date", type: "date", color: "orange" },
  ], [users, varieties]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { dateFrom, dateTo, technician, variety } = exportFilters;
      let url = `/reports/production-excel/?start_date=${dateFrom || ""}&end_date=${dateTo || ""}`;
      if (technician) url += `&technicians=${technician}`;
      if (variety) url += `&varieties=${variety}`;

      const triggerRes = await fetchWithAuth(url);
      if (!triggerRes.ok) throw new Error("Failed to initiate report generation");
      const triggerData = await triggerRes.json();
      const taskId = triggerData.task_id;

      let status = "PENDING";
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes
      while (status !== "SUCCESS" && status !== "FAILURE" && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        const statusRes = await fetchWithAuth(`/reports/check-status/${taskId}/`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          status = statusData.status;
        }
      }

      if (status !== "SUCCESS") {
        throw new Error("Report generation failed or timed out");
      }

      const downloadRes = await fetchWithAuth(`/reports/download/${taskId}/`);
      if (!downloadRes.ok) throw new Error("Failed to download the completed report");

      const blob = await downloadRes.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const filenameDate = dateFrom && dateFrom !== dateTo ? `${dateFrom}_to_${dateTo}` : dateTo;
      link.setAttribute('download', `Progress_Report_${filenameDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to download report', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <ChevronRight className="h-3 w-3" />
            <span>Production Unit</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">Daily Production</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Stage-wise Production Log</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Record plantlet counts and contamination per stage</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportPanel(!showExportPanel)}
          className="shrink-0"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />
          {showExportPanel ? "Hide Export" : "Export Report"}
        </Button>
      </div>

      {/* ── Export panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showExportPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-sm p-4 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-foreground">Export Excel Report</h3>
                <span className="text-xs text-muted-foreground ml-auto">Configure filters then generate</span>
              </div>
              <FilterBar
                filters={exportConfigs}
                values={exportFilters}
                onChange={(k, v) => setExportFilters(prev => ({ ...prev, [k]: v }))}
                onClear={() => setExportFilters({})}
              />
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                  Generate & Download
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage tabs ──────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted border border-border rounded-sm h-9 p-0 flex w-full">
          {STAGES.map((stage) => (
            <TabsTrigger
              key={stage.id}
              value={stage.id}
              className="flex-1 h-full rounded-sm text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-muted-foreground"
            >
              {stage.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          {activeTab === "initiation" && <InitiationTab varieties={varieties?.results || []} />}
          {activeTab === "multiplication" && <MultiplicationTab varieties={varieties?.results || []} />}
          {activeTab === "rooting" && <RootingTab varieties={varieties?.results || []} />}
          {activeTab === "hardening" && <HardeningTab varieties={varieties?.results || []} />}
          {activeTab === "transplantation" && <TransplantationTab varieties={varieties?.results || []} />}
        </div>
      </Tabs>

    </div>
  );
}

// -----------------------------------------
// TABS COMPONENTS
// -----------------------------------------

interface FieldDef {
  name: string;
  label: string;
  type: "number" | "select";
  placeholder?: string;
  selectOptions?: { value: string; label: string }[];
  required?: boolean;
}

interface StagePanelProps {
  varieties: any[];
  isLoading: boolean;
  allRecords: any[];
  createMutation: { mutate: (data: any, options?: any) => void; isPending: boolean };
  mapProductionPayload: (fields: Record<string, string>, varietyId: number, date: string, userId: number) => any;
  mapContaminationPayload: (fields: Record<string, string>, varietyId: number, date: string, userId: number) => any;
  productionFields: FieldDef[];
  contaminationFields: FieldDef[];
  tableHeaders: string[];
  renderRow: (r: any) => React.ReactNode;
  isMortality?: boolean;
}

function StagePanel({
  varieties,
  isLoading,
  allRecords,
  createMutation,
  mapProductionPayload,
  mapContaminationPayload,
  productionFields,
  contaminationFields,
  tableHeaders,
  renderRow,
  isMortality = false,
}: StagePanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { filterValues, setFilterValues, filterConfigs, filteredData, paginatedData, page, setPage, totalPages } = useStageFilters(allRecords);

  const [showContam, setShowContam] = useState(false);

  const [prodVariety, setProdVariety] = useState("");
  const [prodDate, setProdDate] = useState(new Date().toISOString().split("T")[0]);
  const [prodFields, setProdFields] = useState<Record<string, string>>({});

  const [contamVariety, setContamVariety] = useState("");
  const [contamDate, setContamDate] = useState(new Date().toISOString().split("T")[0]);
  const [contamFields, setContamFields] = useState<Record<string, string>>({});

  const handleProdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodVariety) {
      toast({ title: "Error", description: "Variety is required.", variant: "destructive" });
      return;
    }
    const payload = mapProductionPayload(prodFields, parseInt(prodVariety), prodDate, user?.id as number);
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Success", description: "Production log added." });
        setProdFields({});
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleContamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contamVariety) {
      toast({ title: "Error", description: "Variety is required.", variant: "destructive" });
      return;
    }
    const payload = mapContaminationPayload(contamFields, parseInt(contamVariety), contamDate, user?.id as number);
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Success", description: isMortality ? "Mortality log added." : "Contamination log added." });
        setContamFields({});
        setShowContam(false);
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  return (
    <div className="space-y-4">
      {/* Production Form */}
      <form onSubmit={handleProdSubmit} className="flex gap-3 p-4 bg-card rounded-sm border border-border items-end flex-wrap">
        <div className="space-y-1 flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-foreground/80">Variety</label>
          <Select value={prodVariety} onValueChange={setProdVariety}>
            <SelectTrigger className="h-8 rounded-sm text-xs"><SelectValue placeholder="Select Variety" /></SelectTrigger>
            <SelectContent>{varieties.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-foreground/80">Date</label>
          <Input type="date" value={prodDate} onChange={e => setProdDate(e.target.value)} required className="h-8 rounded-sm text-xs" />
        </div>
        {productionFields.map(f => (
          <div key={f.name} className="space-y-1 flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-foreground/80">{f.label}</label>
            {f.type === "select" ? (
              <Select value={prodFields[f.name] || ""} onValueChange={val => setProdFields(p => ({ ...p, [f.name]: val }))}>
                <SelectTrigger className="h-8 rounded-sm text-xs"><SelectValue placeholder={f.placeholder || "Select"} /></SelectTrigger>
                <SelectContent>{f.selectOptions?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input
                type="number"
                min="0"
                value={prodFields[f.name] || ""}
                onChange={e => setProdFields(p => ({ ...p, [f.name]: e.target.value }))}
                placeholder={f.placeholder || "0"}
                required={f.required}
                className="h-8 rounded-sm text-xs"
              />
            )}
          </div>
        ))}
        <Button type="submit" disabled={createMutation.isPending} size="sm" className="h-8 rounded-sm text-xs px-4">
          <Plus className="w-3.5 h-3.5 mr-1" /> Log Production
        </Button>
      </form>

      {/* Contamination Toggle */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowContam(!showContam)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors h-7 text-xs rounded-sm">
          {isMortality ? <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> : <Bug className="w-3.5 h-3.5 mr-1.5" />}
          Log {isMortality ? "Mortality" : "Contamination"}
          {showContam ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      </div>

      <AnimatePresence>
        {showContam && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={handleContamSubmit}
          >
            <div className="flex gap-3 p-4 bg-red-50/20 dark:bg-red-950/5 rounded-sm border border-red-200 dark:border-red-900/30 items-end flex-wrap mb-2">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-red-700 dark:text-red-400">Variety</label>
                <Select value={contamVariety} onValueChange={setContamVariety}>
                  <SelectTrigger className="h-8 rounded-sm text-xs border-red-200 dark:border-red-800"><SelectValue placeholder="Select Variety" /></SelectTrigger>
                  <SelectContent>{varieties.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-red-700 dark:text-red-400">Date Found</label>
                <Input type="date" value={contamDate} onChange={e => setContamDate(e.target.value)} required className="h-8 rounded-sm text-xs border-red-200 dark:border-red-800" />
              </div>
              {contaminationFields.map(f => (
                <div key={f.name} className="space-y-1 flex-1 min-w-[120px]">
                  <label className="text-xs font-semibold text-red-700 dark:text-red-400">{f.label}</label>
                  {f.type === "select" ? (
                    <Select value={contamFields[f.name] || ""} onValueChange={val => setContamFields(p => ({ ...p, [f.name]: val }))}>
                      <SelectTrigger className="h-8 rounded-sm text-xs border-red-200 dark:border-red-800"><SelectValue placeholder={f.placeholder || "Select"} /></SelectTrigger>
                      <SelectContent>{f.selectOptions?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      min="1"
                      value={contamFields[f.name] || ""}
                      onChange={e => setContamFields(p => ({ ...p, [f.name]: e.target.value }))}
                      placeholder={f.placeholder || "0"}
                      required={f.required}
                      className="h-8 rounded-sm text-xs border-red-200 dark:border-red-800"
                    />
                  )}
                </div>
              ))}
              <Button type="submit" variant="destructive" disabled={createMutation.isPending} size="sm" className="h-8 rounded-sm text-xs px-4">
                {isMortality ? <AlertTriangle className="w-3.5 h-3.5 mr-1" /> : <Bug className="w-3.5 h-3.5 mr-1" />}
                Submit Issue
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <FilterBar filters={filterConfigs} values={filterValues} onChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onClear={() => setFilterValues({})} totalCount={allRecords.length} filteredCount={filteredData.length} />

      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {tableHeaders.map((h, idx) => <TableHead key={idx} className="h-8 text-xs font-semibold text-foreground/80">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={tableHeaders.length} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={tableHeaders.length} className="text-center py-6 text-xs text-muted-foreground">No logs found.</TableCell></TableRow>
            ) : (
              paginatedData.map((r: any) => renderRow(r))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredData.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          hasNext={page < totalPages}
          hasPrevious={page > 1}
        />
      )}
    </div>
  );
}

function InitiationTab({ varieties }: { varieties: any[] }) {
  const { data, isLoading } = useInitiationLogs({ page_size: 1000 });
  const createMutation = useCreateInitiationLog();

  const allRecords = data?.results || [];

  return (
    <StagePanel
      varieties={varieties}
      isLoading={isLoading}
      allRecords={allRecords}
      createMutation={createMutation}
      productionFields={[
        { name: "bottles_inoculated", label: "Bottles Inoculated", type: "number", required: true },
      ]}
      contaminationFields={[
        { name: "contaminated_bottles", label: "Contaminated Bottles", type: "number", required: true },
      ]}
      mapProductionPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        bottles_inoculated: parseInt(fields.bottles_inoculated || "0"),
        contaminated_bottles: 0,
      })}
      mapContaminationPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        bottles_inoculated: 0,
        contaminated_bottles: parseInt(fields.contaminated_bottles || "0"),
      })}
      tableHeaders={["Date", "Variety", "Technician", "Inoculated", "Contaminated", "Contamination %"]}
      renderRow={(r) => (
        <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
          <TableCell className="py-2 text-xs">{r.date}</TableCell>
          <TableCell className="py-2 text-xs font-semibold">{r.variety_code}</TableCell>
          <TableCell className="py-2 text-xs">{r.technician_name}</TableCell>
          <TableCell className="py-2 text-xs">{r.bottles_inoculated > 0 ? r.bottles_inoculated : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs">{r.contaminated_bottles > 0 ? <span className="text-red-500 font-bold">{r.contaminated_bottles}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs font-medium text-amber-600">{r.bottles_inoculated > 0 ? ((r.contaminated_bottles / r.bottles_inoculated) * 100).toFixed(2) + '%' : '-'}</TableCell>
        </TableRow>
      )}
    />
  );
}

function MultiplicationTab({ varieties }: { varieties: any[] }) {
  const { data, isLoading } = useMultiplicationLogs({ page_size: 1000 });
  const createMutation = useCreateMultiplicationLog();

  const allRecords = data?.results || [];

  return (
    <StagePanel
      varieties={varieties}
      isLoading={isLoading}
      allRecords={allRecords}
      createMutation={createMutation}
      productionFields={[
        {
          name: "cycle_number",
          label: "Cycle",
          type: "select",
          placeholder: "Select Cycle",
          selectOptions: [1, 2, 3, 4, 5].map((v) => ({ value: v.toString(), label: "Cycle " + v })),
          required: true,
        },
        { name: "bottles_produced", label: "Produced", type: "number", required: true },
      ]}
      contaminationFields={[
        {
          name: "cycle_number",
          label: "Cycle",
          type: "select",
          placeholder: "Select Cycle",
          selectOptions: [1, 2, 3, 4, 5].map((v) => ({ value: v.toString(), label: "Cycle " + v })),
          required: true,
        },
        { name: "contaminated_bottles", label: "Contaminated", type: "number", required: true },
      ]}
      mapProductionPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        cycle_number: parseInt(fields.cycle_number || "0"),
        bottles_produced: parseInt(fields.bottles_produced || "0"),
        contaminated_bottles: 0,
      })}
      mapContaminationPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        cycle_number: parseInt(fields.cycle_number || "0"),
        bottles_produced: 0,
        contaminated_bottles: parseInt(fields.contaminated_bottles || "0"),
      })}
      tableHeaders={["Date", "Variety", "Technician", "Cycle", "Produced", "Contaminated", "Contamination %"]}
      renderRow={(r) => (
        <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
          <TableCell className="py-2 text-xs">{r.date}</TableCell>
          <TableCell className="py-2 text-xs font-semibold">{r.variety_code}</TableCell>
          <TableCell className="py-2 text-xs">{r.technician_name}</TableCell>
          <TableCell className="py-2 text-xs">Cycle {r.cycle_number}</TableCell>
          <TableCell className="py-2 text-xs">{r.bottles_produced > 0 ? r.bottles_produced : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs">{r.contaminated_bottles > 0 ? <span className="text-red-500 font-bold">{r.contaminated_bottles}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs font-medium text-amber-600">{r.bottles_produced > 0 ? ((r.contaminated_bottles / r.bottles_produced) * 100).toFixed(2) + '%' : '-'}</TableCell>
        </TableRow>
      )}
    />
  );
}

function RootingTab({ varieties }: { varieties: any[] }) {
  const { data, isLoading } = useRootingLogs({ page_size: 1000 });
  const createMutation = useCreateRootingLog();

  const allRecords = data?.results || [];

  return (
    <StagePanel
      varieties={varieties}
      isLoading={isLoading}
      allRecords={allRecords}
      createMutation={createMutation}
      productionFields={[
        { name: "basal_bottles", label: "Basal Bottles", type: "number" },
        { name: "rooting_bottles", label: "Rooting Bottles", type: "number", required: true },
      ]}
      contaminationFields={[
        { name: "contaminated_bottles", label: "Contaminated Bottles", type: "number", required: true },
      ]}
      mapProductionPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        basal_bottles: parseInt(fields.basal_bottles || "0"),
        rooting_bottles: parseInt(fields.rooting_bottles || "0"),
        contaminated_bottles: 0,
      })}
      mapContaminationPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        basal_bottles: 0,
        rooting_bottles: 0,
        contaminated_bottles: parseInt(fields.contaminated_bottles || "0"),
      })}
      tableHeaders={["Date", "Variety", "Technician", "Basal", "Rooting", "Contaminated", "Contamination %"]}
      renderRow={(r) => (
        <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
          <TableCell className="py-2 text-xs">{r.date}</TableCell>
          <TableCell className="py-2 text-xs font-semibold">{r.variety_code}</TableCell>
          <TableCell className="py-2 text-xs">{r.technician_name}</TableCell>
          <TableCell className="py-2 text-xs">{r.basal_bottles > 0 ? r.basal_bottles : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs">{r.rooting_bottles > 0 ? r.rooting_bottles : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs">{r.contaminated_bottles > 0 ? <span className="text-red-500 font-bold">{r.contaminated_bottles}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs font-medium text-amber-600">{(r.basal_bottles + r.rooting_bottles) > 0 ? ((r.contaminated_bottles / (r.basal_bottles + r.rooting_bottles)) * 100).toFixed(2) + '%' : '-'}</TableCell>
        </TableRow>
      )}
    />
  );
}

function HardeningTab({ varieties }: { varieties: any[] }) {
  const { data, isLoading } = useHardeningLogs({ page_size: 1000 });
  const createMutation = useCreateHardeningLog();

  const allRecords = data?.results || [];

  return (
    <StagePanel
      varieties={varieties}
      isLoading={isLoading}
      allRecords={allRecords}
      createMutation={createMutation}
      isMortality={true}
      productionFields={[
        { name: "seedlings_transplanted", label: "Seedling Transplant in Green House (Nos)", type: "number", required: true },
      ]}
      contaminationFields={[
        { name: "seedlings_died", label: "Seedling Dried In Green House (Nos)", type: "number", required: true },
      ]}
      mapProductionPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        seedlings_transplanted: parseInt(fields.seedlings_transplanted || "0"),
        seedlings_died: 0,
      })}
      mapContaminationPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        seedlings_transplanted: 0,
        seedlings_died: parseInt(fields.seedlings_died || "0"),
      })}
      tableHeaders={["Date", "Variety", "Technician", "Seedlings Transplanted", "Seedlings Dried", "Mortality %"]}
      renderRow={(r) => (
        <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
          <TableCell className="py-2 text-xs">{r.date}</TableCell>
          <TableCell className="py-2 text-xs font-semibold">{r.variety_code}</TableCell>
          <TableCell className="py-2 text-xs">{r.technician_name}</TableCell>
          <TableCell className="py-2 text-xs">{r.seedlings_transplanted > 0 ? r.seedlings_transplanted : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs">{r.seedlings_died > 0 ? <span className="text-red-500 font-bold">{r.seedlings_died}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs font-medium text-amber-600">{r.seedlings_transplanted > 0 ? ((r.seedlings_died / r.seedlings_transplanted) * 100).toFixed(2) + '%' : '-'}</TableCell>
        </TableRow>
      )}
    />
  );
}

function TransplantationTab({ varieties }: { varieties: any[] }) {
  const { data, isLoading } = useTransplantationLogs({ page_size: 1000 });
  const createMutation = useCreateTransplantationLog();

  const allRecords = data?.results || [];

  return (
    <StagePanel
      varieties={varieties}
      isLoading={isLoading}
      allRecords={allRecords}
      createMutation={createMutation}
      isMortality={true}
      productionFields={[
        { name: "seedlings_transplanted", label: "Seedling Transplant in Field (Nos)", type: "number", required: true },
      ]}
      contaminationFields={[
        { name: "seedlings_died", label: "Seedling Dried in Field (Nos)", type: "number", required: true },
      ]}
      mapProductionPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        seedlings_transplanted: parseInt(fields.seedlings_transplanted || "0"),
        seedlings_died: 0,
      })}
      mapContaminationPayload={(fields, varietyId, date, userId) => ({
        variety: varietyId,
        technician: userId,
        date,
        seedlings_transplanted: 0,
        seedlings_died: parseInt(fields.seedlings_died || "0"),
      })}
      tableHeaders={["Date", "Variety", "Technician", "Seedlings Transplanted", "Seedlings Dried", "Mortality %"]}
      renderRow={(r) => (
        <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
          <TableCell className="py-2 text-xs">{r.date}</TableCell>
          <TableCell className="py-2 text-xs font-semibold">{r.variety_code}</TableCell>
          <TableCell className="py-2 text-xs">{r.technician_name}</TableCell>
          <TableCell className="py-2 text-xs">{r.seedlings_transplanted > 0 ? r.seedlings_transplanted : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs">{r.seedlings_died > 0 ? <span className="text-red-500 font-bold">{r.seedlings_died}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
          <TableCell className="py-2 text-xs font-medium text-amber-600">{r.seedlings_transplanted > 0 ? ((r.seedlings_died / r.seedlings_transplanted) * 100).toFixed(2) + '%' : '-'}</TableCell>
        </TableRow>
      )}
    />
  );
}
