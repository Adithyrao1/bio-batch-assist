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
import type { ContaminationReport, ContaminationReportCreate } from "@/types/api";

function todayISO(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: ContaminationReportCreate) => Promise<void>;
    initialData?: ContaminationReport | null;
    mode: "create" | "edit";
}

interface FormState {
    date: string;
    variety: string;
    source: string;
    type_desc: string;
    bottles_affected: string;
    operator: string;
    notes: string;
}

const defaultForm = (): FormState => ({
    date: todayISO(),
    variety: "",
    source: "",
    type_desc: "",
    bottles_affected: "0",
    operator: "",
    notes: "",
});

function toFormState(record: ContaminationReport): FormState {
    return {
        date: record.date || todayISO(),
        variety: String(record.variety) || "",
        source: record.source || "",
        type_desc: record.type_desc || "",
        bottles_affected: String(record.bottles_affected ?? "0"),
        operator: String(record.operator) || "",
        notes: record.notes || "",
    };
}

export default function ContaminationReportDialog({
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
        if (!form.source.trim()) newErrors.source = "Source is required";
        if (!form.operator) newErrors.operator = "Operator is required";

        const bottles = parseInt(form.bottles_affected);
        if (isNaN(bottles) || bottles < 0) {
            newErrors.bottles_affected = "Must be a valid positive number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: ContaminationReportCreate = {
                date: form.date,
                variety: parseInt(form.variety),
                source: form.source.trim(),
                type_desc: form.type_desc.trim() || undefined,
                bottles_affected: parseInt(form.bottles_affected),
                operator: parseInt(form.operator),
                notes: form.notes.trim() || undefined,
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
                        {mode === "create" ? "Add Contamination Report" : "Edit Report"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                            <Input id="date" type="date" value={form.date} onChange={set("date")} className="mt-1" />
                            {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="source">Contamination Source <span className="text-destructive">*</span></Label>
                            <Input id="source" value={form.source} onChange={set("source")} className="mt-1" placeholder="e.g. Media Airation" />
                            {errors.source && <p className="text-xs text-destructive mt-1">{errors.source}</p>}
                        </div>
                        <div>
                            <Label htmlFor="operator">Operator <span className="text-destructive">*</span></Label>
                            <Select value={form.operator} onValueChange={(val) => setForm((prev) => ({ ...prev, operator: val }))}>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bottles_affected">Bottles Affected <span className="text-destructive">*</span></Label>
                            <Input id="bottles_affected" type="number" min="0" value={form.bottles_affected} onChange={set("bottles_affected")} className="mt-1 text-red-500 font-bold" />
                            {errors.bottles_affected && <p className="text-xs text-destructive mt-1">{errors.bottles_affected}</p>}
                        </div>
                        <div>
                            <Label htmlFor="type_desc">Type Description</Label>
                            <Input id="type_desc" value={form.type_desc} onChange={set("type_desc")} className="mt-1" placeholder="e.g. Fungal" />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={form.notes} onChange={set("notes")} className="mt-1 resize-none" rows={3} placeholder="Additional details..." />
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : mode === "create" ? "Add Report" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
