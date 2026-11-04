import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

const SpecialBanner = () => (
  <section className="py-12 relative overflow-hidden"
    style={{
      background: "linear-gradient(135deg, hsl(20 90% 48%), hsl(37 92% 50%))"
    }}
  >
    {/* Floating food emojis */}
    {["🍕", "🍔", "🍗", "🌮", "🍛"].map((emoji, i) => (
      <motion.span
        key={i}
        className="absolute text-4xl md:text-6xl opacity-10 pointer-events-none select-none"
        style={{ left: `${10 + i * 20}%`, top: `${20 + (i % 3) * 25}%` }}
        animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0] }}
        transition={{ repeat: Infinity, duration: 3 + i * 0.5, ease: "easeInOut" }}
      >
        {emoji}
      </motion.span>
    ))}

    <div className="container mx-auto px-5 lg:px-12 relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-6 h-6 text-primary-foreground" />
            <span className="text-primary-foreground/80 font-semibold text-sm uppercase tracking-wider">Limited Time Offer</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-primary-foreground mb-2">
            Get 50% OFF on Your First Order!
          </h2>
          <p className="text-primary-foreground/80 text-lg">Use code: <span className="font-bold text-primary-foreground bg-primary-foreground/20 px-3 py-1 rounded-full">WELCOME50</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Link to="/menu">
            <Button size="lg" variant="secondary" className="rounded-full text-lg px-10 py-6 gap-2 font-bold shadow-xl hover:scale-105 transition-transform">
              Order Now <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  </section>
);

export default SpecialBanner;
