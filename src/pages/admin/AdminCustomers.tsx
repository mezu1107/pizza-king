import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

const AdminCustomers = () => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [userOrders, setUserOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setProfiles((data || []) as ProfileRow[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const viewUser = async (profile: ProfileRow) => {
    setSelectedUser(profile);
    setOrdersLoading(true);
    const { data } = await supabase.from("orders").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false });
    setUserOrders((data || []) as OrderRow[]);
    setOrdersLoading(false);
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const filtered = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || "").includes(search)
  );

  return (
    <AdminLayout title="Customer Management">
      <div className="space-y-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Name</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Address</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4 font-semibold">{p.full_name || "—"}</td>
                        <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">{p.phone || "—"}</td>
                        <td className="py-3 px-4 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{p.address || "—"}</td>
                        <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => viewUser(p)}>
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No customers found.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold">{selectedUser.full_name || "—"}</span>
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{selectedUser.phone || "—"}</span>
                  <span className="text-muted-foreground">Address:</span>
                  <span>{selectedUser.address || "—"}</span>
                  <span className="text-muted-foreground">Joined:</span>
                  <span>{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-2">Order History</h4>
                  {ordersLoading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  ) : userOrders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No orders yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {userOrders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-mono text-xs">#{o.id.slice(0, 8)}</p>
                            <p className="text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">Rs. {Number(o.total).toLocaleString()}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(o.status)}`}>{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
