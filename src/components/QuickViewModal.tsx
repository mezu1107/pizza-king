import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Heart, Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  food: { id: string; title: string; description?: string; price: number; image_url: string; rating?: number; badge?: string } | null;
  onClose: () => void;
}

const QuickViewModal = ({ food, onClose }: Props) => {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  if (!food) return null;

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url });
    }
    toast({ title: `${food.title} × ${qty} added to cart!` });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: "spring", damping: 25 }}
          className="bg-card rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="relative h-64 overflow-hidden">
            <img src={food.image_url} alt={food.title} className="w-full h-full object-cover" />
            <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-card transition-colors">
              <X className="w-5 h-5" />
            </button>
            {food.badge && (
              <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">{food.badge}</span>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">{food.title}</h2>
                {food.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-accent-foreground text-accent-foreground" />
                    <span className="text-sm font-medium text-foreground">{food.rating}</span>
                  </div>
                )}
              </div>
              <p className="text-2xl font-heading font-extrabold text-primary">Rs. {food.price.toLocaleString()}</p>
            </div>

            {food.description && <p className="text-muted-foreground text-sm leading-relaxed">{food.description}</p>}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity:</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="w-4 h-4" /></Button>
                <span className="w-8 text-center font-bold text-lg">{qty}</span>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(qty + 1)}><Plus className="w-4 h-4" /></Button>
              </div>
              <span className="ml-auto font-bold text-foreground">Rs. {(food.price * qty).toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleAdd} className="flex-1 h-12 rounded-full font-bold gap-2">
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full"
                onClick={() => { isInWishlist(food.id) ? removeFromWishlist(food.id) : addToWishlist({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url }); }}>
                <Heart className={`w-5 h-5 ${isInWishlist(food.id) ? "fill-destructive text-destructive" : ""}`} />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickViewModal;
