import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, MapPin, Leaf, FlaskConical, AlertCircle, TestTube2, ChevronDown, ChevronRight, FlaskRound, CalendarCheck } from "lucide-react";
import { mockAreas, mockVarieties, mockMediaTypes, mockFindings } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { tasksApi } from "@/lib/api";
import {
  useMediaChemicalRequirements,
  useDeleteMediaChemicalRequirement,
  useMediaTypes,
  useChemicals,
} from "@/hooks/useApiQueries";
import MediaChemicalRequirementDialog from "@/components/MediaChemicalRequirementDialog";

const TABS = [
  { id: "areas",             label: "Areas",                 Icon: MapPin,        color: "text-violet-400" },
  { id: "varieties",         label: "Varieties",             Icon: Leaf,          color: "text-emerald-400" },
  { id: "media",             label: "Media Types",           Icon: FlaskConical,  color: "text-sky-400" },
  { id: "findings",          label: "Findings",              Icon: AlertCircle,   color: "text-amber-400" },
  { id: "chem-requirements", label: "Chemical Requirements", Icon: TestTube2,     color: "text-rose-400" },
] as const;

type TabId = typeof TABS[number]["id"];

function SectionHeader({
  title, subtitle, Icon, iconColor, count, onAdd,
}: {
  title: string; subtitle: string; Icon: React.ElementType;
  iconColor: string; count: number; onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border/40">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{count}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button size="sm" onClick={onAdd} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

function RowActions({ onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting?: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={onEdit}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function MasterSection({
  title, subtitle, Icon, iconColor, items, onAdd,
}: {
  title: string; subtitle: string; Icon: React.ElementType;
  iconColor: string; items: string[]; onAdd: () => void;
}) {
  const { toast } = useToast();
  return (
    <div className="space-y-5">
      <SectionHeader title={title} subtitle={subtitle} Icon={Icon} iconColor={iconColor} count={items.length} onAdd={onAdd} />
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-14 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
              <TableHead className="w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <motion.tr
                key={item}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.04 }}
                className="border-border/30 hover:bg-muted/40 transition-colors"
              >
                <TableCell className="text-muted-foreground text-sm font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                <TableCell className="font-medium">{item}</TableCell>
                <TableCell>
                  <RowActions
                    onEdit={() => toast({ title: "Edit" })}
                    onDelete={() => toast({ title: "Delete" })}
                  />
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MasterTable({ title, items }: { title: string; items: string[] }) {
  const { toast } = useToast();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{title}</h3>
        <Button size="sm" onClick={() => toast({ title: `Add ${title}` })}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={item}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>{item}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toast({ title: "Edit" })}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toast({ title: "Delete", variant: "destructive" })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function MasterData() {
  const [activeTab, setActiveTab] = useState<TabId>("areas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialMediaTypeId, setInitialMediaTypeId] = useState<number | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<Set<number>>(new Set());
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [chemicalLoading, setChemicalLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  async function handleTriggerWeeklyDigest() {
    setWeeklyLoading(true);
    try {
      const msg = await tasksApi.triggerWeeklyDigest();
      toast({ title: "Weekly Digest Sent", description: msg });
    } catch {
      toast({ title: "Failed", description: "Could not send weekly digest.", variant: "destructive" });
    } finally {
      setWeeklyLoading(false);
    }
  }

  async function handleTriggerChemicalExpiryDigest() {
    setChemicalLoading(true);
    try {
      const msg = await tasksApi.triggerChemicalExpiryDigest();
      toast({ title: "Chemical Expiry Digest Sent", description: msg });
    } catch {
      toast({ title: "Failed", description: "Could not send chemical expiry digest.", variant: "destructive" });
    } finally {
      setChemicalLoading(false);
    }
  }

  const { data: requirementsData, isLoading: reqLoading } = useMediaChemicalRequirements({ page_size: 1000 });
  const { data: mediaTypesData } = useMediaTypes({ page_size: 1000 });
  const { data: chemicalsData } = useChemicals({ page_size: 1000 });
  const deleteReq = useDeleteMediaChemicalRequirement();

  const requirements = requirementsData?.results ?? [];
  const mediaTypes = mediaTypesData?.results ?? [];
  const chemicals = chemicalsData?.results ?? [];

  const groupedByMedia = useMemo(() => {
    const map = new Map<number, { media_type_name: string; items: typeof requirements }>();
    for (const req of requirements) {
      if (!map.has(req.media_type)) {
        map.set(req.media_type, { media_type_name: req.media_type_name ?? String(req.media_type), items: [] });
      }
      map.get(req.media_type)!.items.push(req);
    }
    return Array.from(map.entries()).map(([media_type, val]) => ({ media_type, ...val }));
  }, [requirements]);

  const toggleMedia = (id: number) => {
    setExpandedMedia(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeColor = TABS.find((t) => t.id === activeTab)!.color;

  const MEDIA_COLORS = [
    { text: "text-sky-400",     border: "border-sky-400/30",     bg: "bg-sky-400/5",     subBg: "bg-sky-400/[0.03]",  dot: "bg-sky-400"     },
    { text: "text-violet-400",  border: "border-violet-400/30",  bg: "bg-violet-400/5",  subBg: "bg-violet-400/[0.03]", dot: "bg-violet-400" },
    { text: "text-emerald-400", border: "border-emerald-400/30", bg: "bg-emerald-400/5", subBg: "bg-emerald-400/[0.03]", dot: "bg-emerald-400" },
    { text: "text-amber-400",   border: "border-amber-400/30",   bg: "bg-amber-400/5",   subBg: "bg-amber-400/[0.03]", dot: "bg-amber-400"   },
    { text: "text-rose-400",    border: "border-rose-400/30",    bg: "bg-rose-400/5",    subBg: "bg-rose-400/[0.03]", dot: "bg-rose-400"    },
    { text: "text-orange-400",  border: "border-orange-400/30",  bg: "bg-orange-400/5",  subBg: "bg-orange-400/[0.03]", dot: "bg-orange-400" },
    { text: "text-pink-400",    border: "border-pink-400/30",    bg: "bg-pink-400/5",    subBg: "bg-pink-400/[0.03]", dot: "bg-pink-400"    },
    { text: "text-teal-400",    border: "border-teal-400/30",    bg: "bg-teal-400/5",    subBg: "bg-teal-400/[0.03]", dot: "bg-teal-400"    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage reference data used across the system</p>
      </div>

      {/* Animated pill tab bar */}
      <div className="relative flex gap-1 rounded-2xl bg-muted/40 border border-border/40 p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ${
              activeTab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === id && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl bg-background shadow-sm border border-border/50"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className={`relative h-3.5 w-3.5 ${activeTab === id ? activeColor : ""}`} />
            <span className="relative hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Animated tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "areas" && (
            <MasterSection title="Areas" subtitle="Lab sections and rooms"
              Icon={MapPin} iconColor="text-violet-400" items={mockAreas}
              onAdd={() => toast({ title: "Add Area" })} />
          )}
          {activeTab === "varieties" && (
            <MasterSection title="Varieties" subtitle="Plant variety codes"
              Icon={Leaf} iconColor="text-emerald-400" items={mockVarieties}
              onAdd={() => toast({ title: "Add Variety" })} />
          )}
          {activeTab === "media" && (
            <MasterSection title="Media Types" subtitle="Culture media formulations"
              Icon={FlaskConical} iconColor="text-sky-400" items={mockMediaTypes}
              onAdd={() => toast({ title: "Add Media Type" })} />
          )}
          {activeTab === "findings" && (
            <MasterSection title="Findings" subtitle="Observation finding categories"
              Icon={AlertCircle} iconColor="text-amber-400" items={mockFindings}
              onAdd={() => toast({ title: "Add Finding" })} />
          )}

          {activeTab === "chem-requirements" && (
            <div className="space-y-5">
              <SectionHeader
                title="Chemical Requirements" subtitle="Chemicals required per media type per litre"
                Icon={TestTube2} iconColor="text-rose-400" count={groupedByMedia.length}
                onAdd={() => { setInitialMediaTypeId(null); setDialogOpen(true); }}
              />
              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-14 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chemicals</TableHead>
                      <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reqLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : groupedByMedia.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                          No requirements defined yet. Click Add to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedByMedia.map((group, i) => {
                        const isOpen = expandedMedia.has(group.media_type);
                        const color = MEDIA_COLORS[i % MEDIA_COLORS.length];
                        return (
                          <>
                            <motion.tr
                              key={group.media_type}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.18, delay: i * 0.04 }}
                              onClick={() => toggleMedia(group.media_type)}
                              className="border-border/30 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                            >
                              <TableCell className="text-muted-foreground text-sm font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isOpen
                                    ? <ChevronDown className={`h-3.5 w-3.5 ${color.text}`} />
                                    : <ChevronRight className={`h-3.5 w-3.5 ${color.text}`} />}
                                  <Badge variant="outline" className={`${color.text} ${color.border} ${color.bg} font-normal`}>
                                    {group.media_type_name}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {group.items.length} chemical{group.items.length !== 1 ? "s" : ""}
                                </Badge>
                              </TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => { setInitialMediaTypeId(group.media_type); setDialogOpen(true); }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </motion.tr>
                            <AnimatePresence>
                              {isOpen && group.items.map((req, j) => (
                                <motion.tr
                                  key={req.id}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15, delay: j * 0.03 }}
                                  className={`border-border/20 ${color.subBg} transition-colors`}
                                >
                                  <TableCell>
                                    <div className={`ml-2 h-4 w-0.5 rounded-full ${color.dot} opacity-40`} />
                                  </TableCell>
                                  <TableCell className={`pl-8 text-sm font-medium ${color.text}`}>{req.chemical_name}</TableCell>
                                  <TableCell>
                                    <span className="tabular-nums font-mono text-sm">{req.quantity_required}</span>
                                    <span className="ml-1 text-xs text-muted-foreground">{req.chemical_unit}</span>
                                  </TableCell>
                                  <TableCell>
                                    <RowActions
                                      onEdit={() => { setInitialMediaTypeId(req.media_type); setDialogOpen(true); }}
                                      onDelete={async () => {
                                        await deleteReq.mutateAsync(req.id);
                                        toast({ title: "Requirement deleted", variant: "destructive" });
                                      }}
                                      deleting={deleteReq.isPending}
                                    />
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <MediaChemicalRequirementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mediaTypes={mediaTypes}
        chemicals={chemicals}
        initialMediaTypeId={initialMediaTypeId}
      />

      {user?.role === "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur shadow-sm p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 border border-border/40">
              <CalendarCheck className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Admin — Trigger Digests</h2>
              <p className="text-xs text-muted-foreground">Manually send email digest reports</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={weeklyLoading}
              onClick={handleTriggerWeeklyDigest}
              className="gap-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
            >
              {weeklyLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarCheck className="h-3.5 w-3.5" />
              )}
              Send Weekly Lab Digest
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={chemicalLoading}
              onClick={handleTriggerChemicalExpiryDigest}
              className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              {chemicalLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FlaskRound className="h-3.5 w-3.5" />
              )}
              Send Chemical Expiry Digest
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
