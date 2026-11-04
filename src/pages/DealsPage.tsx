import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { DbDeal } from "@/types/database";

const DealsPage = () => {
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeals = async () => {
      const { data } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (data) setDeals(data as unknown as DbDeal[]);
      setLoading(false);
    };
    fetchDeals();
  }, []);

  const handleGrabDeal = (deal: DbDeal) => {
    addItem({ id: deal.id, title: deal.title, price: deal.price, imageUrl: deal.image_url });
    toast({ title: `${deal.title} added to cart!` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4">🔥 All Deals</h1>
          <p className="text-muted-foreground text-lg mb-10">Grab these limited-time offers before they're gone!</p>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground text-lg">Loading deals...</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-lg">No active deals right now. Check back soon!</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {deals.map((deal) => (
                <div key={deal.id} className="bg-card rounded-3xl shadow-lg overflow-hidden transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl group">
                  <div className="relative">
                    <img src={deal.image_url} alt={deal.title} className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className={`absolute top-5 right-5 font-bold px-4 py-2 rounded-full text-sm shadow-lg ${deal.badge === "discount" ? "bg-primary text-primary-foreground animate-pulse" : "bg-secondary text-secondary-foreground"}`}>
                      {deal.discount_text}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent h-32" />
                    <div className="absolute bottom-5 left-5 text-white">
                      <p className="text-sm font-medium opacity-90">Limited Time</p>
                      <h3 className="text-xl font-bold">{deal.title}</h3>
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{deal.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-primary">Rs. {deal.price.toLocaleString()}</span>
                        {deal.old_price && <span className="text-muted-foreground line-through ml-2 text-sm">Rs. {deal.old_price.toLocaleString()}</span>}
                      </div>
                      <button onClick={() => handleGrabDeal(deal)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full font-semibold transition-all duration-300 hover:shadow-lg text-sm">
                        Grab Deal
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DealsPage;
