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
import { useVarieties, useUsers } from "@/hooks/useApiQueries";
import type { InoculationRoom, InoculationRoomCreate } from "@/types/api";

function todayISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: InoculationRoomCreate) => Promise<void>;
    initialData?: InoculationRoom | null;
    mode: "create" | "edit";
}

interface FormState {
    date: string;
    variety: string;
    operator: string;
    cultures: string;
    bottles: string;
    total_produced: string;
    remarks: string;
}

const defaultForm = (): FormState => ({
    date: todayISO(),
    variety: "",
    operator: "",
    cultures: "0",
    bottles: "0",
    total_produced: "0",
    remarks: "",
});

function toFormState(record: InoculationRoom): FormState {
    return {
        date: record.date || todayISO(),
        variety: String(record.variety) || "",
        operator: String(record.operator) || "",
        cultures: String(record.cultures ?? "0"),
        bottles: String(record.bottles ?? "0"),
        total_produced: String(record.total_produced ?? "0"),
        remarks: record.remarks || "",
    };
}

export default function InoculationRoomDialog({
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
        if (!form.date) newErrors.date = "Date is required";
        if (!form.variety) newErrors.variety = "Variety is required";
        if (!form.operator) newErrors.operator = "Operator is required";

        const numericFields: (keyof FormState)[] = ["cultures", "bottles", "total_produced"];
        numericFields.forEach(f => {
            const val = form[f];
            const parsed = parseInt(val);
            if (isNaN(parsed) || parsed < 0) {
                newErrors[f] = "Must be a valid positive number";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: InoculationRoomCreate = {
                date: form.date,
                variety: parseInt(form.variety),
                operator: parseInt(form.operator),
                cultures: parseInt(form.cultures),
                bottles: parseInt(form.bottles),
                total_produced: parseInt(form.total_produced),
                remarks: form.remarks.trim() || undefined,
            };
            
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
                        {mode === "create" ? "Add Inoculation Record" : "Edit Inoculation Record"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                            <Input
                                id="date"
                                type="date"
                                value={form.date}
                                onChange={set("date")}
                                className="mt-1"
                            />
                            {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
                        </div>
                        <div>
                            <Label htmlFor="variety">Variety <span className="text-destructive">*</span></Label>
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
                    </div>

                    <div>
                        <Label htmlFor="operator">Operator <span className="text-destructive">*</span></Label>
                        <Select
                            value={form.operator}
                            onValueChange={(val) => setForm((prev) => ({ ...prev, operator: val }))}
                        >
                            <SelectTrigger id="operator" className="mt-1">
                                <SelectValue placeholder="Select operator..." />
                            </SelectTrigger>
                            <SelectContent>
                                {usersList.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name || `(${u.username})`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.operator && <p className="text-xs text-destructive mt-1">{errors.operator}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label htmlFor="cultures" className="text-xs">Cultures <span className="text-destructive">*</span></Label>
                            <Input
                                id="cultures"
                                type="number"
                                min="0"
                                value={form.cultures}
                                onChange={set("cultures")}
                                className="mt-1 text-center font-bold"
                            />
                            {errors.cultures && <p className="text-[10px] text-destructive mt-1">{errors.cultures}</p>}
                        </div>
                        <div>
                            <Label htmlFor="bottles" className="text-xs">Bottles <span className="text-destructive">*</span></Label>
                            <Input
                                id="bottles"
                                type="number"
                                min="0"
                                value={form.bottles}
                                onChange={set("bottles")}
                                className="mt-1 text-center font-bold"
                            />
                            {errors.bottles && <p className="text-[10px] text-destructive mt-1">{errors.bottles}</p>}
                        </div>
                        <div>
                            <Label htmlFor="total_produced" className="text-xs">Total Produced <span className="text-destructive">*</span></Label>
                            <Input
                                id="total_produced"
                                type="number"
                                min="0"
                                value={form.total_produced}
                                onChange={set("total_produced")}
                                className="mt-1 text-center font-bold text-primary bg-primary/5"
                            />
                            {errors.total_produced && <p className="text-[10px] text-destructive mt-1">{errors.total_produced}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="remarks">Remarks <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea
                            id="remarks"
                            value={form.remarks}
                            onChange={set("remarks")}
                            className="mt-1 resize-none"
                            rows={3}
                            placeholder="Any notes about the inoculation process..."
                        />
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
