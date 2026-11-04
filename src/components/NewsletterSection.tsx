import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast({ title: "Subscribed! 🎉", description: "You'll receive our latest offers and updates." });
    setEmail("");
  };

  return (
    <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-foreground/10 rounded-full" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary-foreground/5 rounded-full" />

      <div className="container mx-auto px-5 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-primary-foreground mb-4">
            Stay Updated with Offers
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Subscribe to get exclusive deals, new menu items, and special discounts delivered to your inbox.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-13 rounded-full bg-primary-foreground text-foreground placeholder:text-muted-foreground border-0 px-6 flex-1"
            />
            <Button
              type="submit"
              className="h-13 rounded-full bg-foreground text-background hover:bg-foreground/90 px-8 font-bold gap-2"
            >
              <Send className="w-4 h-4" /> Subscribe
            </Button>
          </form>

          <p className="text-primary-foreground/60 text-sm mt-4">
            No spam, unsubscribe anytime. We respect your privacy.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
