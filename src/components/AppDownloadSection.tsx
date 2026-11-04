import { motion } from "framer-motion";
import { Smartphone, Star } from "lucide-react";

const AppDownloadSection = () => (
  <section className="py-16 md:py-24 bg-card overflow-hidden">
    <div className="container mx-auto px-5 lg:px-12">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Smartphone className="w-4 h-4" /> Coming Soon
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-4">
            Get the <span className="text-primary">Pizza King</span> App
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Order faster, track deliveries in real-time, and get exclusive app-only deals. Download coming soon to iOS and Android!
          </p>
          <div className="flex items-center gap-3 mb-8">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-5 h-5 fill-accent-foreground text-accent-foreground" />
            ))}
            <span className="text-sm text-muted-foreground ml-2">4.9 Rating</span>
          </div>
          <div className="flex gap-4">
            <div className="bg-foreground text-background px-6 py-3 rounded-xl flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
              <span className="text-2xl">🍎</span>
              <div><p className="text-xs opacity-70">Download on the</p><p className="font-bold">App Store</p></div>
            </div>
            <div className="bg-foreground text-background px-6 py-3 rounded-xl flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
              <span className="text-2xl">▶️</span>
              <div><p className="text-xs opacity-70">Get it on</p><p className="font-bold">Google Play</p></div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="relative flex justify-center">
          <div className="relative w-64 h-[500px] bg-gradient-to-br from-primary to-accent-foreground rounded-[3rem] p-3 shadow-2xl">
            <div className="w-full h-full bg-card rounded-[2.5rem] overflow-hidden flex items-center justify-center">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🍽️</span>
                </div>
                <h3 className="font-heading font-bold text-foreground text-lg mb-2">Pizza King</h3>
                <p className="text-sm text-muted-foreground">Your favorite food, one tap away!</p>
              </div>
            </div>
          </div>
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 bg-card rounded-2xl shadow-xl p-4 hidden md:block"
          >
            <p className="text-sm font-bold text-foreground">🔥 50% OFF</p>
            <p className="text-xs text-muted-foreground">First Order</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default AppDownloadSection;
