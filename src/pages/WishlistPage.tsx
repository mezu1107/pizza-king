import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const WishlistPage = () => {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleMoveToCart = (item: typeof items[0]) => {
    addItem({ id: item.id, title: item.title, price: item.price, imageUrl: item.imageUrl });
    removeItem(item.id);
    toast({ title: `${item.title} moved to cart!` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12 max-w-4xl">
          <h1 className="text-4xl font-heading font-extrabold text-foreground mb-8 flex items-center gap-3">
            <Heart className="w-9 h-9 text-primary" /> My Wishlist
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
              <p className="text-xl text-muted-foreground mb-6">Your wishlist is empty</p>
              <Link to="/menu">
                <Button className="rounded-full px-8">Browse Menu</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl shadow-md overflow-hidden group"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-foreground text-lg mb-1">{item.title}</h3>
                    <p className="text-primary font-bold text-xl mb-4">Rs. {item.price.toLocaleString()}</p>
                    <Button className="w-full rounded-full gap-2" onClick={() => handleMoveToCart(item)}>
                      <ShoppingCart className="w-4 h-4" /> Move to Cart
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WishlistPage;
