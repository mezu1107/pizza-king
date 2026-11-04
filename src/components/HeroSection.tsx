import { motion, useScroll, useTransform } from "framer-motion";
import { Search, ArrowDown, Sparkles, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";

const TypeWriter = ({ texts }: { texts: string[] }) => {
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    const timeout = deleting ? 40 : 80;
    if (!deleting && charIdx === current.length) {
      setTimeout(() => setDeleting(true), 2000);
      return;
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setIdx((idx + 1) % texts.length);
      return;
    }
    const timer = setTimeout(() => {
      setCharIdx(deleting ? charIdx - 1 : charIdx + 1);
    }, timeout);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, texts]);

  return (
    <span className="text-highlight">
      {texts[idx].slice(0, charIdx)}
      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="inline-block w-0.5 h-[1em] bg-highlight ml-1 align-baseline" />
    </span>
  );
};


const FloatingFood = ({ emoji, className, delay = 0 }: { emoji: string; className: string; delay?: number }) => (
  <motion.span
    className={`absolute text-5xl md:text-7xl pointer-events-none select-none opacity-20 ${className}`}
    animate={{ y: [0, -25, 0], rotate: [0, 10, -10, 0] }}
    transition={{ repeat: Infinity, duration: 4 + delay, ease: "easeInOut", delay }}
  >
    {emoji}
  </motion.span>
);

const HeroSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const [quickTags, setQuickTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase.from("categories").select("title").eq("active", true).limit(5);
      if (data) setQuickTags(data.map(c => c.title));
    };
    fetchTags();
  }, []);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center pt-20 md:pt-0 overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0">
        <div className="absolute inset-0"
          style={{
            background: `linear-gradient(rgba(20,10,5,0.62), rgba(20,10,5,0.78)), url(${heroBg}) center/cover no-repeat`,
          }}
        />
      </motion.div>

      <div className="absolute inset-0" style={{ perspective: "1200px" }}>
        <motion.div style={{ opacity }} className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50" />
      </div>

      <FloatingFood emoji="🍕" className="top-[15%] left-[5%]" delay={0} />
      <FloatingFood emoji="🍔" className="top-[20%] right-[8%]" delay={0.5} />
      <FloatingFood emoji="🍗" className="bottom-[20%] left-[10%]" delay={1} />
      <FloatingFood emoji="🌮" className="bottom-[25%] right-[5%]" delay={1.5} />
      <FloatingFood emoji="🍛" className="top-[40%] right-[20%]" delay={0.8} />

      <motion.div style={{ opacity, scale }} className="container mx-auto px-5 lg:px-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md px-5 py-2 rounded-full text-sm font-medium mb-8 border border-primary-foreground/20">
            <Sparkles className="w-4 h-4 text-highlight" />
            🤖 AI-Powered Food Ordering
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-7xl font-heading font-extrabold leading-tight mb-6 drop-shadow-2xl">
            Order Your Favorite Food{" "}
            <TypeWriter texts={["Instantly with AI!", "Via WhatsApp!", "Hot & Fresh!", "Best in Town!"]} />
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="text-lg md:text-2xl font-light mb-10 md:mb-12 drop-shadow-lg max-w-3xl mx-auto">
            Just tell our AI what you want — in English or Urdu — and get your order delivered hot!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a href="https://wa.me/923173712950?text=Assalam%20o%20Alaikum!%20I%20want%20to%20order%20from%20The%20Young%20Malang" target="_blank" rel="noopener noreferrer">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 rounded-full font-bold text-lg shadow-2xl transition-all inline-flex items-center justify-center gap-2">
                📱 Order via WhatsApp
              </motion.div>
            </a>
            <Link to="/menu">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="bg-primary-foreground/20 backdrop-blur-sm hover:bg-primary-foreground/30 text-primary-foreground px-10 py-4 rounded-full font-bold text-lg shadow-xl transition-all inline-flex items-center justify-center gap-2 border border-primary-foreground/30">
                🍽️ View Menu
              </motion.div>
            </Link>
          </motion.div>

          {/* Quick tags */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-6 flex flex-wrap justify-center gap-3 md:gap-4">
            {quickTags.map((tag) => (
              <Link key={tag} to={`/menu?search=${tag}`}>
                <motion.span whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
                  className="bg-primary-foreground/20 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-foreground/30 transition-colors">
                  {tag}
                </motion.span>
              </Link>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary-foreground/50">
        <ArrowDown className="w-6 h-6" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
