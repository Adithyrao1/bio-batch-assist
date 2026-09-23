import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Search, GitBranch, Loader2, ChevronDown, Check, Info, Calendar, MapPin, Beaker, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  Node,
  Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { getGenealogy, getSeedLots, SeedLot } from "@/lib/fieldApi";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 260;
const nodeHeight = 140;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// Custom Node Component for Seed Lots
const SeedLotNode = ({ data }: NodeProps) => {
  const { lot, label, holder, quantity, colorClass, isLabNest } = data as any;
  return (
    <div className={`rounded-xl border border-white/10 p-4 w-[260px] h-[130px] backdrop-blur-md ${colorClass} transition-all duration-300`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="text-center h-full flex flex-col justify-center">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block mb-1">
          {label}
        </span>
        <p className="font-mono font-bold text-lg leading-tight">{lot.lot_id}</p>

        {isLabNest ? (
          <p className="text-xs mt-1 opacity-80">Transplanted to Field</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1 truncate">Holder: {holder}</p>
        )}

        <div className="mt-2 bg-muted/50 py-1.5 rounded-lg text-xs font-semibold">
          {isLabNest
            ? "Tissue Culture Origin"
            : lot.stage === "breeder"
              ? `${Math.round(quantity).toLocaleString()} Plantlets`
              : `${quantity.toLocaleString()} quintals`}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default function GenealogyView() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableLots, setAvailableLots] = useState<SeedLot[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedLot, setSelectedLot] = useState<SeedLot | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedLot(node.data.lot as SeedLot);
  }, []);

  useEffect(() => {
    getSeedLots().then(setAvailableLots).catch(console.error);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as globalThis.Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLot = (lotId: string) => {
    const currentIds = search.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (currentIds.includes(lotId)) {
      setSearch(currentIds.filter(id => id !== lotId).join(', '));
    } else {
      setSearch(currentIds.length > 0 ? `${currentIds.join(', ')}, ${lotId}` : lotId);
    }
  };

  const nodeTypes = useMemo(() => ({ seedLot: SeedLotNode }), []);

  const getStageStyle = (stage: string) => {
    switch (stage) {
      case "commercial": return "bg-amber-500/10 border-amber-500/30 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:text-amber-400";
      case "certified": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.15)] dark:text-emerald-400";
      case "foundation": return "bg-blue-500/10 border-blue-500/30 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:text-blue-400";
      case "breeder": return "bg-purple-500/10 border-purple-500/30 text-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.15)] dark:text-purple-400";
      default: return "bg-gray-500/10 border-gray-500/30 text-gray-400 shadow-sm";
    }
  };

  const handleTrace = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!search.trim()) return;

    setLoading(true);
    try {
      const lot_ids = search.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const { nodes: apiNodes, edges: apiEdges } = await getGenealogy(lot_ids);

      if (apiNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        setErrorMsg("None of the entered Lot IDs were found in the database.");
        return;
      }

      const rawNodes: Node[] = apiNodes.map((lot: any) => ({
        id: lot.lot_id,
        type: 'seedLot',
        position: { x: 0, y: 0 },
        width: 260,
        height: 130,
        measured: { width: 260, height: 130 },
        style: { width: 260, height: 130 },
        data: {
          lot,
          label: lot.is_labnest ? 'Tissue Culture Origin' : `Year ${lot.season_year} — ${lot.stage}`,
          holder: lot.holder_name,
          quantity: parseFloat(lot.quantity_kg),
          colorClass: lot.is_labnest 
            ? 'bg-pink-500/10 border-pink-500/30 text-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.15)] dark:text-pink-400' 
            : getStageStyle(lot.stage),
          isLabNest: !!lot.is_labnest,
        },
      }));

      const nodeMap = new Map(apiNodes.map((n: any) => [n.lot_id, n]));
      
      const rawEdges: Edge[] = apiEdges.map(e => {
        const sourceNode = nodeMap.get(e.source);
        let gradId = "grad-tc-br";
        let targetColor = "#a855f7"; // purple

        if (sourceNode?.is_labnest) {
          gradId = "grad-tc-br";
          targetColor = "#a855f7";
        } else if (sourceNode?.stage === "breeder") {
          gradId = "grad-br-fd";
          targetColor = "#3b82f6";
        } else if (sourceNode?.stage === "foundation") {
          gradId = "grad-fd-ct";
          targetColor = "#10b981";
        } else if (sourceNode?.stage === "certified") {
          gradId = "grad-ct-cm";
          targetColor = "#f59e0b";
        }

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: targetColor, strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: targetColor },
        };
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      
      // Clear edges temporarily
      setEdges([]);
      setNodes(layoutedNodes);

      // Render edges after a tick so nodes and handles are fully mounted in the DOM
      setTimeout(() => {
        setEdges(layoutedEdges);
        // Force a layout update
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 50);
      }, 50);

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trace genealogy.");
    } finally {
      setLoading(false);
    }
  }, [search, setNodes, setEdges]);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-4 relative">
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="grad-tc-br" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="grad-br-fd" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="grad-fd-ct" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="grad-ct-cm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-0 left-0 z-10 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-1.5 rounded-lg border border-border"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="max-w-3xl mx-auto w-full text-center shrink-0 mt-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center justify-center gap-2">
          <GitBranch className="h-6 w-6 text-indigo-500" />
          Multi-Lot Genealogy Tracer
        </h1>
        <p className="text-xs text-muted-foreground mb-4">Enter multiple comma-separated IDs (e.g. CM-2029-501, FD-2027-102)</p>

        <form onSubmit={handleTrace} className="flex gap-3">
          <div className="relative flex-1" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="e.g. CM-2029-501, CT-2028-301"
              className="w-full pl-9 pr-10 py-2 bg-card border border-border focus:border-indigo-500 rounded-xl outline-none text-sm shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md text-muted-foreground"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && availableLots.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 p-1">
                {availableLots.map(lot => {
                  const isSelected = search.includes(lot.lot_id);
                  return (
                    <div
                      key={lot.id}
                      onClick={() => toggleLot(lot.lot_id)}
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-muted'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{lot.lot_id}</span>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/50 uppercase tracking-wider">{lot.stage}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Tracing..." : "Trace"}
          </button>
        </form>
        {errorMsg && <p className="text-red-500 text-sm mt-2 font-medium">{errorMsg}</p>}
      </div>

      <div className="flex-1 w-full bg-card/50 rounded-2xl border border-border shadow-inner overflow-hidden relative">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Search for lots to visualize their parallel lineages
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              setTimeout(() => {
                instance.fitView({ padding: 0.2 });
                window.dispatchEvent(new Event('resize'));
              }, 100);
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="var(--tw-colors-muted-foreground)" />
            <Controls className="bg-card border-border shadow-lg" />
            <MiniMap
              className="bg-card border-border shadow-lg rounded-lg overflow-hidden"
              nodeColor={(n) => {
                const stage = ((n.data as any)?.lot?.stage ?? '') as string;
                if (stage === 'commercial') return '#f59e0b';
                if (stage === 'certified') return '#10b981';
                if (stage === 'foundation') return '#3b82f6';
                if (stage === 'breeder') return '#a855f7';
                if (stage === 'tissue_culture') return '#ec4899';
                return '#7c3aed';
              }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Side Panel for Node Details */}
      <Sheet open={!!selectedLot} onOpenChange={(open) => !open && setSelectedLot(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-card/95 backdrop-blur-xl border-l-white/10">
          {selectedLot && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                  <Info className="h-6 w-6 text-indigo-500" />
                  {selectedLot.lot_id}
                </SheetTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {(selectedLot as any).is_labnest ? "Synthetic Tissue Culture Origin" : `Season Year: ${selectedLot.season_year}`}
                </div>
              </SheetHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-white/5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Stage</p>
                    <p className="font-semibold capitalize">{selectedLot.stage}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-white/5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Quantity</p>
                    <p className="font-semibold">
                      {(selectedLot as any).is_labnest ? 'N/A' : (selectedLot.stage === 'breeder' ? `${Math.round(parseFloat(selectedLot.quantity_kg as any))} Plantlets` : `${parseFloat(selectedLot.quantity_kg as any)} kg`)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-white/5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Registered On</p>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedLot.created_at
                        ? new Date(selectedLot.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-white/5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Season Year</p>
                    <p className="font-semibold">{selectedLot.season_year || '—'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-white/5 space-y-3">
                  <h3 className="font-semibold border-b border-border pb-2 mb-2">Custody & Location</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Holder:</strong> {selectedLot.holder_name}</span>
                  </div>
                  {selectedLot.variety && (
                    <div className="flex items-center gap-2 text-sm">
                      <Beaker className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Variety:</strong> {typeof selectedLot.variety === 'object' ? (selectedLot.variety as any).code : selectedLot.variety}</span>
                    </div>
                  )}
                </div>

                {!(selectedLot as any).is_labnest && (selectedLot as any).transactions && (selectedLot as any).transactions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Transaction History</h3>
                    <div className="space-y-3">
                      {(selectedLot as any).transactions.map((txn: any) => (
                        <div key={txn.id} className="p-3 rounded-lg border border-border bg-background/50 flex flex-col gap-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold uppercase text-xs tracking-wider text-indigo-400">{txn.txn_type}</span>
                            <span className="text-muted-foreground text-xs">{new Date(txn.timestamp).toLocaleString()}</span>
                          </div>
                          <div>
                            <strong>Quantity:</strong> {parseFloat(txn.quantity_kg)} {selectedLot.stage === 'breeder' ? 'Plantlets' : 'kg'}
                          </div>
                          {txn.farmer_name && (
                            <div><strong>Assigned to:</strong> {txn.farmer_name}</div>
                          )}
                          {txn.notes && (
                            <div className="text-muted-foreground italic mt-1 text-xs">"{txn.notes}"</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
