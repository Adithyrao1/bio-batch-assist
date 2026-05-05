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
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMediaTypes, useMediaChemicalRequirementsByMediaType, useStockSolutions } from "@/hooks/useApiQueries";
import type { MediaPreparation, MediaPreparationCreate } from "@/types/api";

function todayISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; // YYYY-MM-DD
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: MediaPreparationCreate) => Promise<void>;
    initialData?: MediaPreparation | null;
    mode: "create" | "edit";
}

interface FormState {
    batch_number: string;
    media_type: string;
    prep_date: string;
    quantity: string;
    bottles_prepared: string;
    contamination_notes: string;
    bottles_issued: string;
    issued_date: string;
    stock_usages: { stockId: string; volume: string }[];
}

const defaultForm = (): FormState => ({
    batch_number: "",
    media_type: "",
    prep_date: todayISO(),
    quantity: "",
    bottles_prepared: "",
    contamination_notes: "",
    bottles_issued: "0",
    issued_date: "",
    stock_usages: [],
});

function toFormState(record: MediaPreparation): FormState {
    return {
        batch_number: record.batch_number || "",
        media_type: String(record.media_type) || "",
        prep_date: record.prep_date || todayISO(),
        quantity: record.quantity != null ? String(record.quantity) : "",
        bottles_prepared: String(record.bottles_prepared),
        contamination_notes: record.contamination_notes || "",
        bottles_issued: String(record.bottles_issued ?? "0"),
        issued_date: record.issued_date || "",
        stock_usages: [], // We won't prefill stock usages in edit mode for now
    };
}

export default function MediaPreparationDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    mode,
}: Props) {
    const [form, setForm] = useState<FormState>(defaultForm());
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: mediaTypesData } = useMediaTypes();
    const mediaTypes = mediaTypesData?.results ?? [];

    const selectedMediaTypeId = form.media_type ? Number(form.media_type) : 0;
    const { data: reqData } = useMediaChemicalRequirementsByMediaType(selectedMediaTypeId);
    const { data: stockData } = useStockSolutions({ limit: 1000 });
    const stockSolutions = stockData?.results ?? [];
    const requirements = reqData?.results ?? [];

    const qty = parseFloat(form.quantity);
    const hasQty = !isNaN(qty) && qty > 0;
    const preview = hasQty && requirements.length > 0
        ? requirements.map((req) => ({
            id: req.id,
            name: req.chemical_name ?? "",
            unit: req.chemical_unit ?? "",
            consumed: req.quantity_required * qty,
          }))
        : [];

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
        if (!form.batch_number.trim()) newErrors.batch_number = "Batch number is required";
        if (!form.media_type) newErrors.media_type = "Media type is required";
        if (!form.prep_date) newErrors.prep_date = "Prep date is required";

        const bottlesPrep = parseInt(form.bottles_prepared);
        if (isNaN(bottlesPrep) || bottlesPrep < 0) newErrors.bottles_prepared = "Must be a positive number";

        if (form.quantity) {
            const q = parseFloat(form.quantity);
            if (isNaN(q) || q <= 0) newErrors.quantity = "Must be a positive number";
        } else {
            newErrors.quantity = "Quantity is required";
        }

        if (form.bottles_issued) {
            const issued = parseInt(form.bottles_issued);
            if (isNaN(issued) || issued < 0) newErrors.bottles_issued = "Must be a positive number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const hasStockWarning = false; // We don't block anymore on dry chemicals

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: MediaPreparationCreate = {
                batch_number: form.batch_number,
                media_type: parseInt(form.media_type),
                prep_date: form.prep_date,
                quantity: form.quantity ? parseFloat(form.quantity) : null,
                bottles_prepared: parseInt(form.bottles_prepared),
                contamination_notes: form.contamination_notes || undefined,
                bottles_issued: form.bottles_issued ? parseInt(form.bottles_issued) : 0,
                issued_date: form.issued_date || null,
                stock_usages: form.stock_usages.filter(u => u.stockId && u.volume).map(u => ({
                    stock_solution: parseInt(u.stockId),
                    volume_consumed: parseFloat(u.volume)
                }))
            };
            await onSubmit(payload);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>
                        {mode === "create" ? "Add Media Batch" : "Edit Media Batch"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="batch_number">Batch Number <span className="text-destructive">*</span></Label>
                            <Input
                                id="batch_number"
                                value={form.batch_number}
                                onChange={set("batch_number")}
                                className="mt-1"
                                placeholder="e.g. BATCH-001"
                            />
                            {errors.batch_number && <p className="text-xs text-destructive mt-1">{errors.batch_number}</p>}
                        </div>

                        <div>
                            <Label htmlFor="prep_date">Prep Date <span className="text-destructive">*</span></Label>
                            <Input
                                id="prep_date"
                                type="date"
                                value={form.prep_date}
                                onChange={set("prep_date")}
                                className="mt-1"
                            />
                            {errors.prep_date && <p className="text-xs text-destructive mt-1">{errors.prep_date}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="media_type">Media Type <span className="text-destructive">*</span></Label>
                        <Select
                            value={form.media_type}
                            onValueChange={(val) => setForm((prev) => ({ ...prev, media_type: val }))}
                        >
                            <SelectTrigger id="media_type" className="mt-1">
                                <SelectValue placeholder="Select media type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {mediaTypes.map((mt) => (
                                    <SelectItem key={mt.id} value={String(mt.id)}>{mt.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.media_type && <p className="text-xs text-destructive mt-1">{errors.media_type}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bottles_prepared">Bottles Prepared <span className="text-destructive">*</span></Label>
                            <Input
                                id="bottles_prepared"
                                type="number"
                                min={0}
                                value={form.bottles_prepared}
                                onChange={set("bottles_prepared")}
                                className="mt-1"
                                placeholder="0"
                            />
                            {errors.bottles_prepared && <p className="text-xs text-destructive mt-1">{errors.bottles_prepared}</p>}
                        </div>
                        <div>
                            <Label htmlFor="quantity">Quantity (L) <span className="text-destructive">*</span></Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.01"
                                min={0}
                                value={form.quantity}
                                onChange={set("quantity")}
                                className="mt-1"
                                placeholder="0.00"
                            />
                            {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="contamination_notes">Contamination Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea
                            id="contamination_notes"
                            value={form.contamination_notes}
                            onChange={set("contamination_notes")}
                            className="mt-1 resize-none"
                            rows={2}
                            placeholder="Any notes on contamination..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bottles_issued">Bottles Issued</Label>
                            <Input
                                id="bottles_issued"
                                type="number"
                                min={0}
                                value={form.bottles_issued}
                                onChange={set("bottles_issued")}
                                className="mt-1"
                                placeholder="0"
                            />
                            {errors.bottles_issued && <p className="text-xs text-destructive mt-1">{errors.bottles_issued}</p>}
                        </div>
                        <div>
                            <Label htmlFor="issued_date">Issued Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input
                                id="issued_date"
                                type="date"
                                value={form.issued_date}
                                onChange={set("issued_date")}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {mode === "create" && preview.length > 0 && (
                        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chemicals to be consumed</p>
                            <div className="divide-y max-h-48 overflow-y-auto">
                                {preview.map((row) => {
                                    return (
                                        <div key={row.id} className="flex items-center justify-between py-1.5 text-sm">
                                            <span className="flex items-center gap-1.5">
                                                <span>{row.name}</span>
                                            </span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {row.consumed.toFixed(4)} {row.unit}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {mode === "create" && (
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold">Stock Solutions Used</h4>
                                    <p className="text-xs text-muted-foreground">Log what stock solutions were consumed for this batch</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, stock_usages: [...f.stock_usages, { stockId: "", volume: "" }] }))} className="h-8 gap-1.5">
                                    <Plus className="h-3.5 w-3.5" /> Add Stock
                                </Button>
                            </div>

                            {form.stock_usages.length === 0 ? (
                                <div className="text-center p-6 border border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm">
                                    No stock solutions added. (Optional)
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {form.stock_usages.map((usage, i) => (
                                        <div key={i} className="flex gap-3 items-start bg-muted/20 p-3 rounded-lg border border-border/50 relative">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-xs">Stock Solution</Label>
                                                <Select value={usage.stockId} onValueChange={(val) => {
                                                    const newU = [...form.stock_usages];
                                                    newU[i].stockId = val;
                                                    setForm(f => ({ ...f, stock_usages: newU }));
                                                }}>
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Select stock..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {stockSolutions.map(s => (
                                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                                {s.name} ({s.remaining_volume} {s.unit} left)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-32 space-y-2">
                                                <Label className="text-xs">Volume</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" step="0.01" min="0.01" value={usage.volume} 
                                                        onChange={(e) => {
                                                            const newU = [...form.stock_usages];
                                                            newU[i].volume = e.target.value;
                                                            setForm(f => ({ ...f, stock_usages: newU }));
                                                        }} 
                                                        className="h-8 pr-12"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                        {usage.stockId ? stockSolutions.find(s => s.id.toString() === usage.stockId)?.unit : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="h-8 w-8 mt-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    const newU = [...form.stock_usages];
                                                    newU.splice(i, 1);
                                                    setForm(f => ({ ...f, stock_usages: newU }));
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    </div>{/* end scrollable body */}

                    <DialogFooter className="shrink-0 pt-4 border-t mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || hasStockWarning}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : mode === "create" ? "Add Batch" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
