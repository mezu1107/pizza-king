import { motion } from "framer-motion";
import { Search, ShoppingCart, Truck, Utensils } from "lucide-react";

const steps = [
  { icon: Search, title: "Browse Menu", desc: "Explore our delicious menu with 200+ items across multiple categories.", num: "01" },
  { icon: ShoppingCart, title: "Add to Cart", desc: "Pick your favorites, customize quantities, and add them to your cart.", num: "02" },
  { icon: Truck, title: "Fast Delivery", desc: "Sit back and relax! Your food will arrive hot & fresh at your doorstep.", num: "03" },
  { icon: Utensils, title: "Enjoy!", desc: "Dig in and enjoy the authentic taste of Pizza King. Bon appétit!", num: "04" },
];

const HowItWorks = () => (
  <section className="py-16 md:py-24 bg-background">
    <div className="container mx-auto px-5 lg:px-12">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">
          How It <span className="text-primary">Works</span>
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Ordering your favorite food is as easy as 1-2-3-4!</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {/* Connection line */}
        <div className="hidden lg:block absolute top-20 left-[15%] right-[15%] h-0.5 bg-border" />

        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="relative text-center group"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-20 h-20 mx-auto mb-5 bg-primary/10 rounded-2xl flex items-center justify-center relative group-hover:bg-primary/20 transition-colors"
            >
              <step.icon className="w-9 h-9 text-primary" />
              <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                {step.num}
              </span>
            </motion.div>
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-2">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
