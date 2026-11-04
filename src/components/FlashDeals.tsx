import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

const FlashDeals = () => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("deals").select("*").eq("active", true).eq("featured", true).order("created_at", { ascending: false }).limit(6);
      if (data) setDeals(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleGrab = (deal: Deal) => {
    addItem({ id: deal.id, title: deal.title, price: deal.price, imageUrl: deal.image_url });
    toast({ title: `${deal.title} added to cart!` });
  };

  if (loading) {
    return (
      <section className="py-14 md:py-20 bg-gradient-to-b from-card to-background">
        <div className="container mx-auto px-5 lg:px-12 flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-gradient-to-b from-card to-background">
      <div className="container mx-auto px-5 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-foreground">
            🔥 Flash Deals & Limited Offers
          </h2>
          <Link
            to="/deals"
            className="text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-2 text-lg group"
          >
            View All Deals
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide">
          {deals.map((deal, i) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="min-w-[300px] sm:min-w-[350px] bg-card rounded-3xl shadow-lg overflow-hidden transform transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl snap-start group"
            >
              <div className="relative">
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                />
                <div
                  className={`absolute top-5 right-5 font-bold px-4 py-2 rounded-full text-sm shadow-lg ${
                    deal.badge === "discount"
                      ? "bg-primary text-primary-foreground animate-pulse"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {deal.discount_text}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent h-32" />
                <div className="absolute bottom-5 left-5 text-primary-foreground">
                  <p className="text-sm font-medium opacity-90">Limited Time</p>
                  <h3 className="text-xl font-bold">{deal.title}</h3>
                </div>
              </div>
              <div className="p-5 md:p-6">
                <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                  {deal.description}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      Rs. {deal.price.toLocaleString()}
                    </span>
                    {deal.old_price && (
                      <span className="text-muted-foreground line-through ml-2 text-sm">
                        Rs. {deal.old_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleGrab(deal)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full font-semibold transition-all duration-300 hover:shadow-lg text-sm"
                  >
                    Grab Deal
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlashDeals;
