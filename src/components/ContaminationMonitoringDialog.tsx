import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAreas } from "@/hooks/useApiQueries";
import type { ContaminationMonitoring, ContaminationMonitoringCreate } from "@/types/api";

const COLONY_TYPES = ["Fungal", "Bacterial", "Yeast", "None"] as const;

// Returns current local datetime formatted as "YYYY-MM-DDTHH:MM" for datetime-local input
function nowLocalISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Converts a "YYYY-MM-DDTHH:MM" local string to a full ISO string for the API
function localToISO(local: string): string {
    return new Date(local).toISOString();
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: ContaminationMonitoringCreate) => Promise<void>;
    initialData?: ContaminationMonitoring | null;
    mode: "create" | "edit";
}

interface FormState {
    date_time: string;           // auto-filled, hidden
    observation_datetime: string; // user enters
    area: string;
    plates_exposed: string;
    colony_count: string;
    colony_type: string;
    action_taken: string;
}

const defaultForm = (): FormState => ({
    date_time: nowLocalISO(),
    observation_datetime: "",
    area: "",
    plates_exposed: "",
    colony_count: "0",
    colony_type: "None",
    action_taken: "",
});

function toFormState(record: ContaminationMonitoring): FormState {
    const toLocalISO = (iso: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    return {
        date_time: toLocalISO(record.date_time),
        observation_datetime: toLocalISO(record.observation_datetime),
        area: String(record.area),
        plates_exposed: record.plates_exposed != null ? String(record.plates_exposed) : "",
        colony_count: String(record.colony_count),
        colony_type: record.colony_type || "None",
        action_taken: record.action_taken || "",
    };
}

export default function ContaminationMonitoringDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    mode,
}: Props) {
    const [form, setForm] = useState<FormState>(defaultForm());
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: areasData } = useAreas();
    const areas = areasData?.results ?? [];

    // Reset form whenever dialog opens
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

    const validate = (): boolean => {
        const newErrors: typeof errors = {};
        if (!form.area) newErrors.area = "Area is required";
        if (!form.colony_type) newErrors.colony_type = "Colony type is required";
        const count = parseInt(form.colony_count);
        if (isNaN(count) || count < 0) newErrors.colony_count = "Must be 0 or more";
        if (form.plates_exposed && (isNaN(parseInt(form.plates_exposed)) || parseInt(form.plates_exposed) < 0)) {
            newErrors.plates_exposed = "Must be a positive number";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: ContaminationMonitoringCreate = {
                date_time: localToISO(form.date_time),
                area: parseInt(form.area),
                plates_exposed: form.plates_exposed ? parseInt(form.plates_exposed) : null,
                observation_datetime: form.observation_datetime ? localToISO(form.observation_datetime) : null,
                colony_count: parseInt(form.colony_count),
                colony_type: form.colony_type,
                action_taken: form.action_taken || undefined,
            };
            await onSubmit(payload);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Add Contamination Record" : "Edit Contamination Record"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">

                    {/* Exposure Date/Time — auto-filled, displayed read-only */}
                    <div>
                        <Label>Exposure Date / Time</Label>
                        <Input
                            type="datetime-local"
                            value={form.date_time}
                            onChange={set("date_time")}
                            className="mt-1 bg-muted text-muted-foreground cursor-default"
                            readOnly
                            tabIndex={-1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Auto-filled with today's date and time
                        </p>
                    </div>

                    {/* Observation Date/Time — user enters */}
                    <div>
                        <Label htmlFor="observation_datetime">
                            Observation Date / Time
                            <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                            id="observation_datetime"
                            type="datetime-local"
                            value={form.observation_datetime}
                            onChange={set("observation_datetime")}
                            className="mt-1"
                        />
                    </div>

                    {/* Area */}
                    <div>
                        <Label htmlFor="area">Area <span className="text-destructive">*</span></Label>
                        <Select
                            value={form.area}
                            onValueChange={(val) => setForm((prev) => ({ ...prev, area: val }))}
                        >
                            <SelectTrigger id="area" className="mt-1">
                                <SelectValue placeholder="Select area…" />
                            </SelectTrigger>
                            <SelectContent>
                                {areas.map((a) => (
                                    <SelectItem key={a.id} value={String(a.id)}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.area && <p className="text-xs text-destructive mt-1">{errors.area}</p>}
                    </div>

                    {/* Plates Exposed + Colony Count side by side */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="plates_exposed">
                                Plates Exposed
                                <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="plates_exposed"
                                type="number"
                                min={0}
                                value={form.plates_exposed}
                                onChange={set("plates_exposed")}
                                placeholder="e.g. 3"
                                className="mt-1"
                            />
                            {errors.plates_exposed && (
                                <p className="text-xs text-destructive mt-1">{errors.plates_exposed}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="colony_count">
                                Colony Count <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="colony_count"
                                type="number"
                                min={0}
                                value={form.colony_count}
                                onChange={set("colony_count")}
                                placeholder="0"
                                className="mt-1"
                            />
                            {errors.colony_count && (
                                <p className="text-xs text-destructive mt-1">{errors.colony_count}</p>
                            )}
                        </div>
                    </div>

                    {/* Colony Type */}
                    <div>
                        <Label htmlFor="colony_type">Colony Type <span className="text-destructive">*</span></Label>
                        <Select
                            value={form.colony_type}
                            onValueChange={(val) => setForm((prev) => ({ ...prev, colony_type: val }))}
                        >
                            <SelectTrigger id="colony_type" className="mt-1">
                                <SelectValue placeholder="Select colony type…" />
                            </SelectTrigger>
                            <SelectContent>
                                {COLONY_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.colony_type && (
                            <p className="text-xs text-destructive mt-1">{errors.colony_type}</p>
                        )}
                    </div>

                    {/* Action Taken */}
                    <div>
                        <Label htmlFor="action_taken">
                            Action Taken
                            <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Textarea
                            id="action_taken"
                            value={form.action_taken}
                            onChange={set("action_taken")}
                            placeholder="Describe action taken…"
                            className="mt-1 resize-none"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving…
                                </>
                            ) : mode === "create" ? "Add Record" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
