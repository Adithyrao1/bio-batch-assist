import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useVarieties, useUsers } from "@/hooks/useApiQueries";
import type { GrowthRoom, GrowthRoomCreate } from "@/types/api";

function todayISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: GrowthRoomCreate) => Promise<void>;
    initialData?: GrowthRoom | null;
    mode: "create" | "edit";
}

interface FormState {
    ltd_date: string;
    variety: string;
    planning: string;
    opening_bottles: string;
    opening_cultures: string;
    issued_bottles: string;
    issued_cultures: string;
    received_bottles: string;
    received_cultures: string;
    contaminated_bottles: string;
    contaminated_cultures: string;
    recorded_by: string;
}

const defaultForm = (): FormState => ({
    ltd_date: todayISO(),
    variety: "",
    planning: "",
    opening_bottles: "0",
    opening_cultures: "0",
    issued_bottles: "0",
    issued_cultures: "0",
    received_bottles: "0",
    received_cultures: "0",
    contaminated_bottles: "0",
    contaminated_cultures: "0",
    recorded_by: "",
});

function toFormState(record: GrowthRoom): FormState {
    return {
        ltd_date: record.ltd_date || todayISO(),
        variety: String(record.variety) || "",
        planning: record.planning || "",
        opening_bottles: String(record.opening_bottles ?? "0"),
        opening_cultures: String(record.opening_cultures ?? "0"),
        issued_bottles: String(record.issued_bottles ?? "0"),
        issued_cultures: String(record.issued_cultures ?? "0"),
        received_bottles: String(record.received_bottles ?? "0"),
        received_cultures: String(record.received_cultures ?? "0"),
        contaminated_bottles: String(record.contaminated_bottles ?? "0"),
        contaminated_cultures: String(record.contaminated_cultures ?? "0"),
        recorded_by: String(record.recorded_by) || "",
    };
}

export default function GrowthRoomDialog({
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
    // Filter active users if you prefer; currently showing all or based on API defaults
    const usersList = usersData?.results ?? []; 

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
        e: React.ChangeEvent<HTMLInputElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    // Auto-calculations: closing = opening + received - issued - contaminated
    const getVal = (val: string) => {
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const closing_bottles = getVal(form.opening_bottles) + getVal(form.received_bottles) - getVal(form.issued_bottles) - getVal(form.contaminated_bottles);
    const closing_cultures = getVal(form.opening_cultures) + getVal(form.received_cultures) - getVal(form.issued_cultures) - getVal(form.contaminated_cultures);

    const validate = (): boolean => {
        const newErrors: typeof errors = {};
        if (!form.variety) newErrors.variety = "Variety is required";
        if (!form.ltd_date) newErrors.ltd_date = "LTD Date is required";
        if (!form.recorded_by) newErrors.recorded_by = "Recorder is required";

        // Ensuring we don't end up with negative stock mathematically if needed, but the formula handles basic math.
        // For simplicity, just require valid non-negative numbers in all fields
        const numericFields: (keyof FormState)[] = [
            "opening_bottles", "opening_cultures",
            "issued_bottles", "issued_cultures",
            "received_bottles", "received_cultures",
            "contaminated_bottles", "contaminated_cultures"
        ];
        
        numericFields.forEach(f => {
            const v = parseInt(form[f]);
            if (isNaN(v) || v < 0) newErrors[f] = "Invalid number";
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: GrowthRoomCreate = {
                ltd_date: form.ltd_date,
                variety: parseInt(form.variety),
                planning: form.planning.trim() || undefined,
                opening_bottles: getVal(form.opening_bottles),
                opening_cultures: getVal(form.opening_cultures),
                issued_bottles: getVal(form.issued_bottles),
                issued_cultures: getVal(form.issued_cultures),
                received_bottles: getVal(form.received_bottles),
                received_cultures: getVal(form.received_cultures),
                contaminated_bottles: getVal(form.contaminated_bottles),
                contaminated_cultures: getVal(form.contaminated_cultures),
                closing_bottles,
                closing_cultures,
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
                        {mode === "create" ? "Add Growth Room Record" : "Edit Growth Room Record"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    
                    {/* Top Section Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl border border-white/5">
                        <div>
                            <Label htmlFor="ltd_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LTD Date <span className="text-destructive">*</span></Label>
                            <Input
                                id="ltd_date"
                                type="date"
                                value={form.ltd_date}
                                onChange={set("ltd_date")}
                                className="mt-1"
                            />
                            {errors.ltd_date && <p className="text-xs text-destructive mt-1">{errors.ltd_date}</p>}
                        </div>
                        <div>
                            <Label htmlFor="variety" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variety <span className="text-destructive">*</span></Label>
                            <Select
                                value={form.variety}
                                onValueChange={(val) => setForm((prev) => ({ ...prev, variety: val }))}
                            >
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
                            <Label htmlFor="recorded_by" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorded By <span className="text-destructive">*</span></Label>
                            <Select
                                value={form.recorded_by}
                                onValueChange={(val) => setForm((prev) => ({ ...prev, recorded_by: val }))}
                            >
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

                    <div>
                        <Label htmlFor="planning">Planning Remarks</Label>
                        <Input
                            id="planning"
                            value={form.planning}
                            onChange={set("planning")}
                            className="mt-1"
                            placeholder="Optional planning notes..."
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* OPENING */}
                        <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Opening</h4>
                            <div>
                                <Label htmlFor="opening_bottles" className="text-xs">Bottles</Label>
                                <Input id="opening_bottles" type="number" min="0" value={form.opening_bottles} onChange={set("opening_bottles")} className="mt-1 h-8" />
                            </div>
                            <div>
                                <Label htmlFor="opening_cultures" className="text-xs">Cultures</Label>
                                <Input id="opening_cultures" type="number" min="0" value={form.opening_cultures} onChange={set("opening_cultures")} className="mt-1 h-8" />
                            </div>
                        </div>

                        {/* RECEIVED */}
                        <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-500/70 text-center">Received (+)</h4>
                            <div>
                                <Label htmlFor="received_bottles" className="text-xs">Bottles</Label>
                                <Input id="received_bottles" type="number" min="0" value={form.received_bottles} onChange={set("received_bottles")} className="mt-1 h-8" />
                            </div>
                            <div>
                                <Label htmlFor="received_cultures" className="text-xs">Cultures</Label>
                                <Input id="received_cultures" type="number" min="0" value={form.received_cultures} onChange={set("received_cultures")} className="mt-1 h-8" />
                            </div>
                        </div>

                        {/* ISSUED */}
                        <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500/70 text-center">Issued (-)</h4>
                            <div>
                                <Label htmlFor="issued_bottles" className="text-xs">Bottles</Label>
                                <Input id="issued_bottles" type="number" min="0" value={form.issued_bottles} onChange={set("issued_bottles")} className="mt-1 h-8" />
                            </div>
                            <div>
                                <Label htmlFor="issued_cultures" className="text-xs">Cultures</Label>
                                <Input id="issued_cultures" type="number" min="0" value={form.issued_cultures} onChange={set("issued_cultures")} className="mt-1 h-8" />
                            </div>
                        </div>

                        {/* CONTAMINATED */}
                        <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-red-500/70 text-center">Contaminated (-)</h4>
                            <div>
                                <Label htmlFor="contaminated_bottles" className="text-xs">Bottles</Label>
                                <Input id="contaminated_bottles" type="number" min="0" value={form.contaminated_bottles} onChange={set("contaminated_bottles")} className="mt-1 h-8" />
                            </div>
                            <div>
                                <Label htmlFor="contaminated_cultures" className="text-xs">Cultures</Label>
                                <Input id="contaminated_cultures" type="number" min="0" value={form.contaminated_cultures} onChange={set("contaminated_cultures")} className="mt-1 h-8" />
                            </div>
                        </div>
                    </div>

                    {/* CLOSING TOTALS (READ-ONLY AUTO CALCULATED) */}
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between mt-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Closing Balances</span>
                            <span className="text-xs text-muted-foreground mt-1">Calculated automatically</span>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">{closing_bottles}</p>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bottles</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">{closing_cultures}</p>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cultures</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
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
                                    Saving...
                                </>
                            ) : mode === "create" ? "Add Record" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
