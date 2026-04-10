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
import type { Chemical, ChemicalCreate } from "@/types/api";

function todayISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: ChemicalCreate) => Promise<void>;
    initialData?: Chemical | null;
    mode: "create" | "edit";
}

interface FormState {
    name: string;
    quantity: string;
    unit: string;
    mfg_date: string;
    expiry_date: string;
    received_date: string;
    remaining_stock: string;
    supplier: string;
}

const defaultForm = (): FormState => ({
    name: "",
    quantity: "",
    unit: "L",
    mfg_date: "",
    expiry_date: "",
    received_date: todayISO(),
    remaining_stock: "",
    supplier: "",
});

function toFormState(record: Chemical): FormState {
    return {
        name: record.name || "",
        quantity: record.quantity != null ? String(record.quantity) : "",
        unit: record.unit || "L",
        mfg_date: record.mfg_date || "",
        expiry_date: record.expiry_date || "",
        received_date: record.received_date || todayISO(),
        remaining_stock: record.remaining_stock != null ? String(record.remaining_stock) : "",
        supplier: record.supplier || "",
    };
}

export default function ChemicalDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    mode,
}: Props) {
    const [form, setForm] = useState<FormState>(defaultForm());
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const validate = (): boolean => {
        const newErrors: typeof errors = {};
        if (!form.name.trim()) newErrors.name = "Chemical name is required";
        if (!form.unit) newErrors.unit = "Unit is required";

        const q = parseFloat(form.quantity);
        if (isNaN(q) || q < 0) newErrors.quantity = "Must be a valid positive number";

        const rs = parseFloat(form.remaining_stock);
        if (isNaN(rs) || rs < 0) newErrors.remaining_stock = "Must be a valid positive number";

        if (!form.received_date) newErrors.received_date = "Received date is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: ChemicalCreate = {
                name: form.name.trim(),
                quantity: parseFloat(form.quantity),
                unit: form.unit,
                mfg_date: form.mfg_date || "", // Send empty string if not provided; backend should handle date formats or allow null
                expiry_date: form.expiry_date || "",
                received_date: form.received_date,
                remaining_stock: parseFloat(form.remaining_stock),
                supplier: form.supplier.trim() || undefined,
            };
            
            // Clean empty dates to prevent Django API validation errors if expected format is strictly YYYY-MM-DD
            if (!payload.mfg_date) delete (payload as any).mfg_date;
            if (!payload.expiry_date) delete (payload as any).expiry_date;

            await onSubmit(payload);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Add Chemical Record" : "Edit Chemical Record"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Chemical Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={set("name")}
                            className="mt-1"
                            placeholder="e.g. Potassium Nitrate"
                        />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="quantity">Total Quantity <span className="text-destructive">*</span></Label>
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
                        <div>
                            <Label htmlFor="unit">Unit <span className="text-destructive">*</span></Label>
                            <Select
                                value={form.unit}
                                onValueChange={(val) => setForm((prev) => ({ ...prev, unit: val }))}
                            >
                                <SelectTrigger id="unit" className="mt-1">
                                    <SelectValue placeholder="Select unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="L">Liters (L)</SelectItem>
                                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                    <SelectItem value="g">Grams (g)</SelectItem>
                                    <SelectItem value="mg">Milligrams (mg)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.unit && <p className="text-xs text-destructive mt-1">{errors.unit}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="remaining_stock">Initial Remaining Stock <span className="text-destructive">*</span></Label>
                            <Input
                                id="remaining_stock"
                                type="number"
                                step="0.01"
                                min={0}
                                value={form.remaining_stock}
                                onChange={set("remaining_stock")}
                                className="mt-1"
                                placeholder="0.00"
                            />
                            {errors.remaining_stock && <p className="text-xs text-destructive mt-1">{errors.remaining_stock}</p>}
                        </div>
                        <div>
                            <Label htmlFor="supplier">Supplier <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input
                                id="supplier"
                                value={form.supplier}
                                onChange={set("supplier")}
                                className="mt-1"
                                placeholder="e.g. Sigma Aldrich"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label htmlFor="mfg_date" className="text-xs">Mfg Date</Label>
                            <Input
                                id="mfg_date"
                                type="date"
                                value={form.mfg_date}
                                onChange={set("mfg_date")}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="expiry_date" className="text-xs">Expiry Date</Label>
                            <Input
                                id="expiry_date"
                                type="date"
                                value={form.expiry_date}
                                onChange={set("expiry_date")}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="received_date" className="text-xs">Received Date <span className="text-destructive">*</span></Label>
                            <Input
                                id="received_date"
                                type="date"
                                value={form.received_date}
                                onChange={set("received_date")}
                                className="mt-1"
                            />
                            {errors.received_date && <p className="text-xs text-destructive mt-1">{errors.received_date}</p>}
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
                            ) : mode === "create" ? "Add Chemical" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
