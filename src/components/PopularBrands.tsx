import { motion } from "framer-motion";

const brands = [
  { name: "Pepsi", icon: "🥤" },
  { name: "Coca Cola", icon: "🥫" },
  { name: "Nestle", icon: "🧊" },
  { name: "Shan", icon: "🌶️" },
  { name: "Knorr", icon: "🍲" },
  { name: "National", icon: "🫕" },
];

const PopularBrands = () => (
  <section className="py-12 bg-card border-y border-border overflow-hidden">
    <div className="container mx-auto px-5 lg:px-12">
      <p className="text-center text-sm text-muted-foreground font-medium mb-8 uppercase tracking-wider">Trusted Ingredient Partners</p>
      <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
        {brands.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.15 }}
            className="flex flex-col items-center gap-2 cursor-default"
          >
            <span className="text-4xl">{b.icon}</span>
            <span className="text-xs text-muted-foreground font-medium">{b.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PopularBrands;
