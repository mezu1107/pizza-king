import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Ahmed Khan",
    role: "Regular Customer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    rating: 5,
    text: "Best burgers in Mankiala! Juicy patty, fresh buns and the delivery is always on time. Pizza King is our family's weekend go-to.",
  },
  {
    id: 2,
    name: "Fatima Ali",
    role: "Food Blogger",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    rating: 5,
    text: "I've reviewed hundreds of fast-food spots and Pizza King stands out for consistency. The fried chicken is crispy every single time.",
  },
  {
    id: 3,
    name: "Usman Raza",
    role: "Corporate Client",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    rating: 4,
    text: "We order Pizza King family deals for all our office lunches. Fast service, big portions and very reasonable pricing.",
  },
  {
    id: 4,
    name: "Sara Malik",
    role: "Loyal Customer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
    rating: 5,
    text: "The loaded pizza and fries combo is unbeatable! Always served piping hot. Can't imagine ordering from anywhere else now.",
  },
];

const TestimonialsSection = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section className="py-16 md:py-24 bg-card relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 opacity-5">
        <Quote className="w-40 h-40 text-primary" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-5 rotate-180">
        <Quote className="w-40 h-40 text-primary" />
      </div>

      <div className="container mx-auto px-5 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it — hear from our happy customers
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="bg-background rounded-3xl p-8 md:p-12 shadow-xl text-center"
            >
              <img
                src={testimonials[current].avatar}
                alt={testimonials[current].name}
                className="w-20 h-20 rounded-full mx-auto mb-6 object-cover ring-4 ring-primary/20"
              />
              <div className="flex justify-center gap-1 mb-6">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < testimonials[current].rating ? "fill-accent-foreground text-accent-foreground" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="text-foreground text-lg md:text-xl leading-relaxed mb-6 italic">
                "{testimonials[current].text}"
              </p>
              <h4 className="font-heading font-bold text-foreground text-lg">
                {testimonials[current].name}
              </h4>
              <p className="text-muted-foreground text-sm">{testimonials[current].role}</p>
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-14 w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-14 w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-3 h-3 rounded-full transition-all ${i === current ? "bg-primary w-8" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
