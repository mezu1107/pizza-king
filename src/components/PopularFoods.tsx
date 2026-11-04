import { motion } from "framer-motion";
import { Star, ShoppingCart, Heart, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Food = Tables<"foods">;

const renderStars = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < full
              ? "fill-accent-foreground text-accent-foreground"
              : i === full && half
              ? "fill-accent-foreground/50 text-accent-foreground"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">({rating})</span>
    </div>
  );
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const PopularFoods = () => {
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("foods").select("*").eq("active", true).eq("featured", true).order("rating", { ascending: false }).limit(6);
      if (data) setFoods(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleAddToCart = (food: Food) => {
    addItem({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url });
    toast({ title: `${food.title} added to cart!` });
  };

  const toggleWishlist = (food: Food) => {
    if (isInWishlist(food.id)) {
      removeFromWishlist(food.id);
      toast({ title: `${food.title} removed from wishlist` });
    } else {
      addToWishlist({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url, description: food.description || "", rating: food.rating || 0 });
      toast({ title: `${food.title} added to wishlist! ❤️` });
    }
  };

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-5 lg:px-12 flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (foods.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-5 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-foreground mb-4">
            Popular Dishes
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Customer favorites – fresh, tasty and made with love every single day!
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {foods.map((food) => (
            <motion.div
              key={food.id}
              variants={itemVariants}
              className="bg-card rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 group"
            >
              <div className="relative h-48 md:h-56 overflow-hidden">
                <img
                  src={food.image_url}
                  alt={food.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                {food.badge && (
                  <div className="absolute top-4 left-4 bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-full text-xs shadow-md">
                    {food.badge}
                  </div>
                )}
                <button
                  onClick={() => toggleWishlist(food)}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
                    isInWishlist(food.id)
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-card/70 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isInWishlist(food.id) ? "fill-current" : ""}`} />
                </button>
              </div>
              <div className="p-5 md:p-6">
                <h4 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  {food.title}
                </h4>
                <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                  {food.description}
                </p>
                <div className="mb-4">{renderStars(food.rating || 0)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold text-2xl">
                    Rs. {food.price.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleAddToCart(food)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:shadow-lg text-sm flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Order Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-12 md:mt-16">
          <Link
            to="/menu"
            className="inline-flex items-center gap-3 bg-foreground text-background px-10 py-4 rounded-full font-bold text-lg shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1 hover:opacity-90"
          >
            View Full Menu →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularFoods;
