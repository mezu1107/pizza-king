import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Star, Search, ShoppingCart, Heart, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { DbFood, DbCategory } from "@/types/database";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import PizzaCustomizer from "@/components/PizzaCustomizer";
import { isPizza } from "@/lib/pizzaOptions";

type SortKey = "popular" | "price-asc" | "price-desc" | "rating" | "newest";

const MenuPage = () => {
  const [foods, setFoods] = useState<DbFood[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customizing, setCustomizing] = useState<DbFood | null>(null);
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const [foodsRes, catsRes] = await Promise.all([
        supabase.from("foods").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("title"),
      ]);
      if (foodsRes.data) setFoods(foodsRes.data as unknown as DbFood[]);
      if (catsRes.data) setCategories(catsRes.data as unknown as DbCategory[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = foods.filter((f) => {
      const matchesCategory = !selectedCategory || f.category_id === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRating = (f.rating || 0) >= minRating;
      const matchesPrice = !maxPrice || f.price <= Number(maxPrice);
      return matchesCategory && matchesSearch && matchesRating && matchesPrice;
    });
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        list = [...list].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "popular":
      default:
        list = [...list].sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            (b.rating || 0) - (a.rating || 0)
        );
    }
    return list;
  }, [foods, selectedCategory, searchQuery, sort, minRating, maxPrice]);

  const handleAddToCart = (food: DbFood) => {
    const catTitle = categories.find((c) => c.id === food.category_id)?.title;
    if (isPizza(food.title, catTitle)) {
      addRecentlyViewed({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url });
      setCustomizing(food);
      return;
    }
    addItem({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url });
    addRecentlyViewed({ id: food.id, title: food.title, price: food.price, imageUrl: food.image_url });
    toast({ title: `${food.title} added to cart!` });
  };

  const toggleWishlist = (food: DbFood) => {
    if (isInWishlist(food.id)) {
      removeFromWishlist(food.id);
      toast({ title: `${food.title} removed from wishlist` });
    } else {
      addToWishlist({
        id: food.id,
        title: food.title,
        price: food.price,
        imageUrl: food.image_url,
        description: food.description || "",
        rating: food.rating,
      });
      toast({ title: `${food.title} added to wishlist! ❤️` });
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.round(rating)
              ? "fill-accent-foreground text-accent-foreground"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">({rating})</span>
    </div>
  );

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setSort("popular");
    setMinRating(0);
    setMaxPrice("");
  };

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (sort !== "popular" ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4">
              Our Menu
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Explore all dishes from Pizza King
            </p>
          </motion.div>

          {/* Search + Sort */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search dishes, ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-full"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-12 rounded-full md:w-52">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              className="h-12 rounded-full gap-2 relative"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-card rounded-2xl shadow-sm border border-border/50 p-4 mb-6 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Min Rating
                  </label>
                  <Select
                    value={String(minRating)}
                    onValueChange={(v) => setMinRating(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="3">3★ & up</SelectItem>
                      <SelectItem value="4">4★ & up</SelectItem>
                      <SelectItem value="4.5">4.5★ & up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Max Price (Rs.)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 1000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="gap-2 text-muted-foreground"
                  >
                    <X className="w-4 h-4" /> Clear all
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Category filters — single scrollable line */}
          <div className="-mx-4 px-4 mb-8">
            <div className="flex gap-2.5 overflow-x-auto whitespace-nowrap pb-2 [scrollbar-width:thin]">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-5 py-2.5 rounded-full font-medium transition-all ${
                  !selectedCategory
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground hover:bg-muted/80 border border-border"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-5 py-2.5 rounded-full font-medium transition-all ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card text-muted-foreground hover:bg-muted/80 border border-border"
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          </div>


          <p className="text-sm text-muted-foreground mb-4">
            {loading ? "" : `${filtered.length} ${filtered.length === 1 ? "dish" : "dishes"} found`}
          </p>

          {/* Foods grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between pt-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-9 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-lg">
              No dishes found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filtered.map((food, i) => (
                <motion.div
                  key={food.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.4 }}
                  onMouseEnter={() =>
                    addRecentlyViewed({
                      id: food.id,
                      title: food.title,
                      price: food.price,
                      imageUrl: food.image_url,
                    })
                  }
                  className="bg-card rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group"
                >
                  <div className="relative h-48 md:h-56 overflow-hidden">
                    <img
                      src={food.image_url}
                      alt={food.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
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
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-foreground mb-1">{food.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {food.description}
                    </p>
                    <div className="mb-3">{renderStars(food.rating)}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-bold text-2xl">
                        Rs. {food.price.toLocaleString()}
                      </span>
                      <Button size="sm" className="rounded-full gap-2" onClick={() => handleAddToCart(food)}>
                        <ShoppingCart className="w-4 h-4" /> Add
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <PizzaCustomizer food={customizing} onClose={() => setCustomizing(null)} />
      <Footer />
    </div>
  );
};

export default MenuPage;
