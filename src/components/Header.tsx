import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, Menu, LogOut, Heart, UserCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Deals", href: "/deals" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Track Order", href: "/track-order" },
];

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "shadow-lg" : ""}`}
    >
      <nav className="backdrop-blur-xl bg-card/80 border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-5 lg:px-12">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={logo} alt="Pizza King" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-primary/30" />
              <div className="leading-tight">
                <div className="font-heading font-extrabold text-base md:text-xl text-primary">Pizza King <span className="text-secondary"></span></div>
                <div className="text-[10px] md:text-[11px] text-muted-foreground italic -mt-0.5">Fast Food • Big Taste • Young Vibes</div>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-6 xl:gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`font-medium text-sm transition-colors relative group ${location.pathname === link.href ? "text-primary" : "text-foreground/80 hover:text-primary"}`}
                >
                  {link.label}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${location.pathname === link.href ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 md:gap-4">


              {/* Wishlist */}
              <Link to="/wishlist" className="relative text-foreground/70 hover:text-primary transition-colors p-1.5">
                <Heart className="w-5 h-5 md:w-6 md:h-6" />
                <AnimatePresence>
                  {wishlistCount > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                      {wishlistCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Cart */}
              <Link to="/cart" className="relative text-foreground/70 hover:text-primary transition-colors p-1.5">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {user ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/profile">
                    <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-primary">
                      <UserCircle className="w-6 h-6" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-2" onClick={signOut}>
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <Link to="/auth" className="hidden md:flex">
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" /> Sign In
                  </Button>
                </Link>
              )}

              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetTitle className="font-heading text-primary text-xl mb-1 flex items-center gap-2">
                    <img src={logo} alt="Logo" className="w-8 h-8 rounded-full" />
                    Pizza King
                  </SheetTitle>
                  <p className="text-xs italic text-muted-foreground mb-5">Fast Food • Big Taste • Young Vibes</p>
                  <div className="flex flex-col gap-3">
                    {navLinks.map((link) => (
                      <Link key={link.label} to={link.href} className={`text-lg font-medium py-2.5 border-b border-border/50 transition-colors ${location.pathname === link.href ? "text-primary" : "text-foreground/80 hover:text-primary"}`}>
                        {link.label}
                      </Link>
                    ))}
                    <Link to="/orders" className="text-lg font-medium text-foreground/80 hover:text-primary py-2.5 border-b border-border/50">My Orders</Link>
                    <Link to="/faq" className="text-lg font-medium text-foreground/80 hover:text-primary py-2.5 border-b border-border/50">FAQ</Link>
                    <Link to="/wishlist" className="text-lg font-medium text-foreground/80 hover:text-primary py-2.5 border-b border-border/50">
                      Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                    </Link>
                    {user && (
                      <Link to="/profile" className="text-lg font-medium text-foreground/80 hover:text-primary py-2.5 border-b border-border/50">
                        My Profile
                      </Link>
                    )}
                    {user ? (
                      <Button className="w-full mt-4 gap-2" variant="outline" onClick={signOut}>
                        <LogOut className="w-4 h-4" /> Sign Out
                      </Button>
                    ) : (
                      <Link to="/auth">
                        <Button className="w-full mt-4 gap-2">
                          <User className="w-4 h-4" /> Sign In
                        </Button>
                      </Link>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </motion.header>
  );
};

export default Header;
