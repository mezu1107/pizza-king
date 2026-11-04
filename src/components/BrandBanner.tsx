import { motion } from "framer-motion";
import { Flame, Zap, Beef, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

const BrandBanner = () => {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)", backgroundSize: "24px 24px" }} />

      <div className="container mx-auto px-5 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Logo / image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring" }}
            className="relative flex justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl rounded-full" />
            <motion.img
              src={logo}
              alt="Pizza King fast food restaurant logo"
              className="relative w-64 md:w-80 lg:w-96 rounded-full shadow-2xl ring-4 ring-primary/20"
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full px-4 py-2 font-bold text-sm shadow-lg"
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              100% Fresh
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
              <Sparkles className="w-4 h-4" /> Fast Food, Big Taste
            </span>

            <h2 className="font-heading font-extrabold text-3xl md:text-5xl lg:text-6xl leading-tight text-foreground">
              Fast Food, <span className="text-primary">Big Taste</span>,
              <br /><span className="text-secondary">Young Vibes</span>
            </h2>

            <p className="italic text-lg md:text-2xl font-bold text-primary tracking-wide">
              "Fast Food • Big Taste • Young Vibes"
            </p>

            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              Pizza King is Mankiala's bold new fast-food spot — smashed burgers, loaded pizzas,
              crispy fried chicken, wraps, rolls and golden fries. Made to order, fired up fast and
              delivered piping hot across Rawalpindi.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Beef, label: "Juicy Burgers" },
                { icon: Flame, label: "Fired Up Fresh" },
                { icon: Zap, label: "Fast Delivery" },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-3 text-center"
                >
                  <f.icon className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">{f.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-4">
              <Link to="/menu" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                🍽️ Explore Menu
              </Link>
              <a href="https://wa.me/923173712950?text=Assalam%20o%20Alaikum!%20I%20want%20to%20order%20from%20The%20Young%20Malang" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-7 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                📱 Order on WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BrandBanner;
