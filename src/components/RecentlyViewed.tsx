import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRecentlyViewed,
  clearRecentlyViewed,
  type RecentItem,
} from "@/lib/recentlyViewed";

const RecentlyViewed = () => {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(getRecentlyViewed());
    refresh();
    window.addEventListener("recently-viewed-updated", refresh);
    return () => window.removeEventListener("recently-viewed-updated", refresh);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-12 bg-muted/20">
      <div className="container mx-auto px-5 lg:px-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary" /> Recently Viewed
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecentlyViewed}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to="/menu" className="block group">
                  <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-primary font-bold mt-0.5">
                        Rs. {item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
