import { motion } from "framer-motion";
import { ChefHat, Award, Users, Clock, Flame, Heart, Shield, Truck, Star, Utensils } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const stats = [
  { icon: Users, label: "Happy Customers", value: "50,000+", color: "text-primary" },
  { icon: Utensils, label: "Menu Items", value: "200+", color: "text-accent-foreground" },
  { icon: Clock, label: "Years of Service", value: "10+", color: "text-primary" },
  { icon: Star, label: "5-Star Reviews", value: "15,000+", color: "text-accent-foreground" },
];

const values = [
  { icon: Flame, title: "Fresh Ingredients", desc: "We source the freshest ingredients daily from local farms and trusted suppliers." },
  { icon: Heart, title: "Made with Love", desc: "Every dish is crafted with passion and traditional recipes passed down through generations." },
  { icon: Shield, title: "Hygienic Cooking", desc: "Our kitchen maintains the highest hygiene standards with regular inspections." },
  { icon: Truck, title: "Fast Delivery", desc: "Hot food at your doorstep within 30-45 minutes, guaranteed." },
  { icon: Award, title: "Award Winning", desc: "Recognized as the best food delivery service in the region for 3 consecutive years." },
  { icon: ChefHat, title: "Expert Chefs", desc: "Our team of professional chefs brings 50+ years of combined culinary experience." },
];

const team = [
  { name: "Chef Ahmad", role: "Head Chef", img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80" },
  { name: "Sarah Khan", role: "Pastry Chef", img: "https://images.unsplash.com/photo-1607631568010-a87245c0daf8?auto=format&fit=crop&w=400&q=80" },
  { name: "Ali Raza", role: "Grill Master", img: "https://images.unsplash.com/photo-1583394293214-28ez1c5eb034?auto=format&fit=crop&w=400&q=80" },
  { name: "Fatima Noor", role: "Operations Manager", img: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=400&q=80" },
];

const AboutPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main>
      {/* Hero */}
      <section className="relative pt-24 pb-20 overflow-hidden"
        style={{
          background: "linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.75)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2000&q=80') center/cover"
        }}
      >
        <div className="container mx-auto px-5 lg:px-12 text-center">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="text-4xl md:text-6xl font-heading font-extrabold text-primary-foreground mb-6">
            Our <span className="text-accent-foreground">Story</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
            className="text-lg md:text-xl text-primary-foreground/80 max-w-3xl mx-auto leading-relaxed">
            Born in Mankiala, Rawalpindi — Pizza King is a fast-food brand built on bold flavour, big portions and young energy. Fast Food. Big Taste. Young Vibes.
          </motion.p>
        </div>
      </section>

      {/* Animated Stats */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-5 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center p-6 rounded-2xl bg-background shadow-md hover:shadow-xl transition-shadow"
              >
                <s.icon className={`w-10 h-10 mx-auto mb-3 ${s.color}`} />
                <p className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-5 lg:px-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-6">
                A Journey of <span className="text-primary">Flavor & Passion</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Pizza King started in Mankiala, Rawalpindi with one simple mission — serve seriously good fast food, fast. Smashed burgers, loaded pizzas, crispy fried chicken and golden fries, every single day.</p>
                <p>What began as one small counter quickly became a local favourite, known for bold flavours, generous portions and an unwavering commitment to freshness.</p>
                <p>Today we serve hungry customers across Rawalpindi with a full fast-food menu — burgers, pizza, sandwiches, wraps, rolls, fried chicken, sides, drinks and value deals — all cooked to order.</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80" alt="Pizza King fast food kitchen" className="w-full h-80 md:h-96 object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-6 rounded-2xl shadow-xl hidden md:block">
                <p className="text-3xl font-heading font-extrabold">10k+</p>
                <p className="text-sm">Thousands of Orders Served</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-5 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">
              Why <span className="text-primary">Pizza King</span>?
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-background rounded-2xl p-8 shadow-md hover:shadow-xl transition-all group cursor-default"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <v.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-bold text-foreground mb-3">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-5 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">
              Meet Our <span className="text-primary">Team</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">The talented people behind every delicious meal</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {team.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -10 }}
                className="text-center group"
              >
                <div className="relative rounded-2xl overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl transition-shadow aspect-square">
                  <img src={t.img} alt={t.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-heading font-bold text-foreground">{t.name}</h3>
                <p className="text-sm text-primary">{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default AboutPage;
