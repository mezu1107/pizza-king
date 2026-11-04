import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadRiderDocument, openRiderDocument } from "@/lib/riderDocuments";

const RiderDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [expiry, setExpiry] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("rider_documents" as any).select("*").eq("rider_id", user.id).order("created_at", { ascending: false });
    setDocs((data as any[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !docType.trim() || !file) { toast({ title: "Choose a document type and photo or PDF", variant: "destructive" }); return; }
    setSaving(true);
    let path: string | undefined;
    try {
      path = await uploadRiderDocument(user.id, file);
      const { error } = await supabase.from("rider_documents").insert({ rider_id: user.id, doc_type: docType.trim(), file_url: "", storage_path: path, expiry_date: expiry || null, status: "pending" });
      if (error) throw error;
      toast({ title: "Document uploaded" }); setOpen(false); setDocType(""); setFile(null); setExpiry(""); await load();
    } catch (error) {
      if (path) await supabase.storage.from("rider-documents").remove([path]);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const doc = docs.find(d => d.id === id);
    const { error } = await supabase.from("rider_documents").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    if (doc?.storage_path) await supabase.storage.from("rider-documents").remove([doc.storage_path]);
    load();
  };

  return (
    <RiderLayout title="Documents">
      <div className="max-w-3xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> My Documents</h1>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        {docs.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No documents yet. Add your CNIC, license, etc.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docs.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{d.doc_type}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full capitalize ${d.status === "approved" ? "bg-green-100 text-green-800" : d.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{d.status}</span>
                    {d.expiry_date && <p className="text-xs text-muted-foreground mt-1">Expires: {d.expiry_date}</p>}
                    {(d.file_url || d.storage_path) && <Button size="sm" variant="outline" className="mt-2" onClick={() => openRiderDocument(d).catch(error => toast({ title: "Cannot open document", description: error.message, variant: "destructive" }))}>View file</Button>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(d.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Document Type *</Label><Input value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. CNIC, Driving License" /></div>
              <div><Label htmlFor="rider-document-file">Photo or PDF</Label><Input id="rider-document-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
              <Button onClick={add} disabled={saving} className="w-full">{saving ? "Uploading..." : "Save Document"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RiderLayout>
  );
};
export default RiderDocuments;
