import { motion } from "framer-motion";
import { Phone } from "lucide-react";

const FloatingWhatsApp = () => (
  <motion.a
    href="https://wa.me/923173712950?text=Assalam%20o%20Alaikum!%20I%20want%20to%20order%20from%20The%20Young%20Malang"
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="fixed bottom-6 left-6 z-50 group flex items-center gap-2 pl-3 pr-4 py-3 bg-primary text-primary-foreground rounded-full shadow-xl border border-accent/30"
    aria-label="Order on WhatsApp"
  >
    <span className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
      <Phone className="w-4 h-4" />
    </span>
    <span className="text-sm font-semibold tracking-wide hidden sm:inline">
      Order Now
    </span>
    <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-ping" />
  </motion.a>
);

export default FloatingWhatsApp;
