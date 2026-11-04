import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Users, Utensils, Star, Truck } from "lucide-react";

const stats = [
  { icon: Users, label: "Happy Customers", end: 50000, suffix: "+" },
  { icon: Utensils, label: "Dishes Served", end: 200000, suffix: "+" },
  { icon: Star, label: "5-Star Reviews", end: 15000, suffix: "+" },
  { icon: Truck, label: "Orders Delivered", end: 100000, suffix: "+" },
];

const AnimatedNumber = ({ end, suffix, inView }: { end: number; suffix: string; inView: boolean }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const dur = 2000;
    const step = end / (dur / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);
  return <>{val.toLocaleString()}{suffix}</>;
};

const StatsCounter = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 bg-primary relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary-foreground/5 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-5 lg:px-12 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="text-center text-primary-foreground"
            >
              <s.icon className="w-10 h-10 mx-auto mb-3 opacity-80" />
              <p className="text-3xl md:text-5xl font-heading font-extrabold">
                <AnimatedNumber end={s.end} suffix={s.suffix} inView={inView} />
              </p>
              <p className="text-sm md:text-base mt-2 opacity-80">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
