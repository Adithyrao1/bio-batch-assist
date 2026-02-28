import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { mockAreas, mockVarieties, mockMediaTypes, mockFindings } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1 className="text-2xl font-bold mb-6">Master Data</h1>
      <Tabs defaultValue="areas">
        <TabsList>
          <TabsTrigger value="areas">Areas</TabsTrigger>
          <TabsTrigger value="varieties">Varieties</TabsTrigger>
          <TabsTrigger value="media">Media Types</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
        </TabsList>
        <TabsContent value="areas"><MasterTable title="Areas" items={mockAreas} /></TabsContent>
        <TabsContent value="varieties"><MasterTable title="Varieties" items={mockVarieties} /></TabsContent>
        <TabsContent value="media"><MasterTable title="Media Types" items={mockMediaTypes} /></TabsContent>
        <TabsContent value="findings"><MasterTable title="Findings" items={mockFindings} /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
