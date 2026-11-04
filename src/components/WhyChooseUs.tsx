import { motion } from "framer-motion";
import { Leaf, Truck, BadgeDollarSign, ShieldCheck, Clock, Heart } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "Fresh Ingredients",
    description: "We source the finest, freshest ingredients daily to ensure every dish bursts with authentic flavor.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Hot food at your doorstep within 30–45 minutes. We value your time as much as your taste.",
  },
  {
    icon: BadgeDollarSign,
    title: "Affordable Prices",
    description: "Premium quality food at prices that won't break the bank. Value for every rupee spent.",
  },
  {
    icon: ShieldCheck,
    title: "Hygienic Cooking",
    description: "Our kitchen follows strict hygiene standards. Clean, safe, and inspected regularly.",
  },
  {
    icon: Clock,
    title: "Open Late",
    description: "Craving midnight food? We serve till late so you never have to go hungry.",
  },
  {
    icon: Heart,
    title: "Made with Love",
    description: "Every dish is crafted with passion by our experienced chefs who love what they do.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WhyChooseUs = () => {
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
            Why Choose Pizza King?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're not just another food delivery — we're your trusted kitchen partner
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group bg-card rounded-2xl p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
