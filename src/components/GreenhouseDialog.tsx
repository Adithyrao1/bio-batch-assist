import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useVarieties, useUsers, useFindingTypes } from "@/hooks/useApiQueries";
import type { Greenhouse, GreenhouseCreate } from "@/types/api";

function todayISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: GreenhouseCreate) => Promise<void>;
    initialData?: Greenhouse | null;
    mode: "create" | "edit";
}

interface FormState {
    variety: string;
    batch_number: string;
    transplant_date: string;
    operation_date: string;
    operation_description: string;
    observation_date: string;
    findings: number[];
    plantlets_died: string;
    recorded_by: string;
}

const defaultForm = (): FormState => ({
    variety: "",
    batch_number: "",
    transplant_date: "",
    operation_date: "",
    operation_description: "",
    observation_date: todayISO(),
    findings: [],
    plantlets_died: "0",
    recorded_by: "",
});

function toFormState(record: Greenhouse): FormState {
    return {
        variety: String(record.variety) || "",
        batch_number: record.batch_number || "",
        transplant_date: record.transplant_date || "",
        operation_date: record.operation_date || "",
        operation_description: record.operation_description || "",
        observation_date: record.observation_date || todayISO(),
        findings: record.findings || [],
        plantlets_died: String(record.plantlets_died ?? "0"),
        recorded_by: String(record.recorded_by) || "",
    };
}

export default function GreenhouseDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    mode,
}: Props) {
    const [form, setForm] = useState<FormState>(defaultForm());
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: varietiesData } = useVarieties();
    const varieties = varietiesData?.results ?? [];

    const { data: usersData } = useUsers();
    const usersList = usersData?.results ?? [];

    const { data: findingsData } = useFindingTypes();
    const findingTypes = findingsData?.results ?? [];

    useEffect(() => {
        if (open) {
            if (mode === "edit" && initialData) {
                setForm(toFormState(initialData));
            } else {
                setForm(defaultForm());
            }
            setErrors({});
        }
    }, [open, mode, initialData]);

    const set = (field: keyof FormState) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const toggleFinding = (id: number) => {
        setForm((prev) => {
            const exists = prev.findings.includes(id);
            if (exists) {
                return { ...prev, findings: prev.findings.filter((fid) => fid !== id) };
            }
            return { ...prev, findings: [...prev.findings, id] };
        });
    };

    const validate = (): boolean => {
        const newErrors: typeof errors = {};
        if (!form.variety) newErrors.variety = "Variety is required";
        if (!form.batch_number.trim()) newErrors.batch_number = "Batch number is required";
        if (!form.transplant_date) newErrors.transplant_date = "Transplant date is required";
        if (!form.operation_date) newErrors.operation_date = "Operation date is required";
        if (!form.observation_date) newErrors.observation_date = "Observation date is required";
        if (!form.recorded_by) newErrors.recorded_by = "Recorded by is required";

        const died = parseInt(form.plantlets_died);
        if (isNaN(died) || died < 0) {
            newErrors.plantlets_died = "Must be a valid positive number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: GreenhouseCreate = {
                variety: parseInt(form.variety),
                batch_number: form.batch_number.trim(),
                transplant_date: form.transplant_date,
                operation_date: form.operation_date,
                operation_description: form.operation_description.trim() || undefined,
                observation_date: form.observation_date,
                findings: form.findings,
                plantlets_died: parseInt(form.plantlets_died),
                recorded_by: parseInt(form.recorded_by),
            };
            
            await onSubmit(payload);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Add Greenhouse Record" : "Edit Greenhouse Record"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="batch_number">Batch Number <span className="text-destructive">*</span></Label>
                            <Input id="batch_number" value={form.batch_number} onChange={set("batch_number")} className="mt-1" />
                            {errors.batch_number && <p className="text-xs text-destructive mt-1">{errors.batch_number}</p>}
                        </div>
                        <div>
                            <Label htmlFor="variety">Variety <span className="text-destructive">*</span></Label>
                            <Select value={form.variety} onValueChange={(val) => setForm((prev) => ({ ...prev, variety: val }))}>
                                <SelectTrigger id="variety" className="mt-1">
                                    <SelectValue placeholder="Select variety..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {varieties.map((v) => (
                                        <SelectItem key={v.id} value={String(v.id)}>{v.code} - {v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.variety && <p className="text-xs text-destructive mt-1">{errors.variety}</p>}
                        </div>
                        <div>
                            <Label htmlFor="recorded_by">Recorded By <span className="text-destructive">*</span></Label>
                            <Select value={form.recorded_by} onValueChange={(val) => setForm((prev) => ({ ...prev, recorded_by: val }))}>
                                <SelectTrigger id="recorded_by" className="mt-1">
                                    <SelectValue placeholder="Select user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {usersList.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name || `(${u.username})`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.recorded_by && <p className="text-xs text-destructive mt-1">{errors.recorded_by}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                        <div>
                            <Label htmlFor="transplant_date" className="text-[10px] uppercase tracking-wide">Transplant Date <span className="text-destructive">*</span></Label>
                            <Input id="transplant_date" type="date" value={form.transplant_date} onChange={set("transplant_date")} className="mt-1 h-8" />
                            {errors.transplant_date && <p className="text-[10px] text-destructive mt-1">{errors.transplant_date}</p>}
                        </div>
                        <div>
                            <Label htmlFor="operation_date" className="text-[10px] uppercase tracking-wide">Operation Date <span className="text-destructive">*</span></Label>
                            <Input id="operation_date" type="date" value={form.operation_date} onChange={set("operation_date")} className="mt-1 h-8" />
                            {errors.operation_date && <p className="text-[10px] text-destructive mt-1">{errors.operation_date}</p>}
                        </div>
                        <div>
                            <Label htmlFor="observation_date" className="text-[10px] uppercase tracking-wide">Observation Date <span className="text-destructive">*</span></Label>
                            <Input id="observation_date" type="date" value={form.observation_date} onChange={set("observation_date")} className="mt-1 h-8" />
                            {errors.observation_date && <p className="text-[10px] text-destructive mt-1">{errors.observation_date}</p>}
                        </div>
                        <div>
                            <Label htmlFor="plantlets_died" className="text-[10px] uppercase tracking-wide text-red-500">Plantlets Died <span className="text-destructive">*</span></Label>
                            <Input id="plantlets_died" type="number" min="0" value={form.plantlets_died} onChange={set("plantlets_died")} className="mt-1 h-8 text-red-500 font-bold" />
                            {errors.plantlets_died && <p className="text-[10px] text-destructive mt-1">{errors.plantlets_died}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="operation_description">Operation Description</Label>
                        <Textarea id="operation_description" value={form.operation_description} onChange={set("operation_description")} className="mt-1 resize-none" rows={2} placeholder="Description..." />
                    </div>

                    <div>
                        <Label className="mb-2 block">Findings & Health Indicators</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/40 rounded-xl border border-white/5">
                            {findingTypes.map((finding) => (
                                <div key={finding.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`finding-${finding.id}`} 
                                        checked={form.findings.includes(finding.id)}
                                        onCheckedChange={() => toggleFinding(finding.id)}
                                    />
                                    <label
                                        htmlFor={`finding-${finding.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {finding.name} <span className="text-[10px] opacity-70 ml-1">({finding.severity})</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : mode === "create" ? "Add Record" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
