import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trash2, Star } from "lucide-react";

interface ReviewRow {
  id: string;
  user_id: string;
  user_name: string;
  food_id: string | null;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setReviews((data || []) as unknown as ReviewRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleApproval = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("reviews" as any)
      .update({ approved: !current })
      .eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: current ? "Review unapproved" : "Review approved ✅" }); fetchReviews(); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews" as any).delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Review deleted" }); fetchReviews(); }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-accent-foreground text-accent-foreground" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <AdminLayout title="Reviews Management">
      <div className="space-y-6">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : reviews.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reviews.map((review) => (
              <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`${!review.approved ? "border-dashed border-2" : ""}`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{review.user_name || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${review.approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {review.approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    {renderStars(review.rating)}
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => toggleApproval(review.id, review.approved)}
                      >
                        <Check className="w-3 h-3" /> {review.approved ? "Unapprove" : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive gap-1"
                        onClick={() => deleteReview(review.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReviews;
