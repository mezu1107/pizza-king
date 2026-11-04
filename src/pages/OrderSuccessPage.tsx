import { motion } from "framer-motion";
import { CheckCircle2, PartyPopper, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

const confettiColors = ["hsl(20 90% 48%)", "hsl(47 100% 50%)", "hsl(0 72% 50%)", "hsl(120 50% 50%)", "hsl(200 80% 50%)"];

const ConfettiPiece = ({ i }: { i: number }) => {
  const x = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const dur = 2 + Math.random() * 2;
  const color = confettiColors[i % confettiColors.length];
  const size = 6 + Math.random() * 8;

  return (
    <motion.div
      initial={{ y: -20, x: `${x}vw`, opacity: 1, rotate: 0 }}
      animate={{ y: "100vh", opacity: 0, rotate: 720 }}
      transition={{ duration: dur, delay, ease: "easeIn" }}
      className="fixed top-0 z-50 pointer-events-none"
      style={{ left: 0, width: size, height: size, backgroundColor: color, borderRadius: Math.random() > 0.5 ? "50%" : "2px" }}
    />
  );
};

const OrderSuccessPage = () => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {showConfetti && Array.from({ length: 50 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}

      <main className="pt-24 pb-16 flex items-center justify-center min-h-[70vh]">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, type: "spring" }}
          className="text-center max-w-lg px-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4 flex items-center justify-center gap-3">
            Order Placed! <PartyPopper className="w-10 h-10 text-accent-foreground" />
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Your order has been placed successfully! Our chefs are already preparing your delicious meal.
            You'll receive updates on your order status.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/orders">
              <Button size="lg" className="rounded-full gap-2 w-full sm:w-auto">
                Track Order <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/menu">
              <Button size="lg" variant="outline" className="rounded-full w-full sm:w-auto">
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderSuccessPage;
