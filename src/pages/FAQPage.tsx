import { motion } from "framer-motion";
import { HelpCircle, Search } from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const faqData = [
  { cat: "Ordering", q: "How do I place an order?", a: "Simply browse our menu, add items to your cart, and proceed to checkout. You'll need to create an account or sign in before confirming your order." },
  { cat: "Ordering", q: "Can I customize my order?", a: "Yes! You can add special instructions for each item during checkout. Our chefs will do their best to accommodate your preferences." },
  { cat: "Ordering", q: "What is the minimum order amount?", a: "There is no minimum order amount. You can order as little or as much as you'd like!" },
  { cat: "Ordering", q: "Can I schedule an order for later?", a: "Currently we accept immediate orders only. Scheduled ordering feature is coming soon!" },
  { cat: "Delivery", q: "What areas do you deliver to?", a: "We deliver across Mankiala, Rawalpindi and surrounding areas. Enter your address at checkout to check availability." },
  { cat: "Delivery", q: "How long does delivery take?", a: "Typical delivery time is 30-45 minutes depending on your location and order size." },
  { cat: "Delivery", q: "Is there a delivery fee?", a: "Delivery charges vary by distance. Orders above a certain amount qualify for free delivery!" },
  { cat: "Delivery", q: "Can I track my order?", a: "Yes! Once your order is confirmed, you can track its status in real-time from your Orders page." },
  { cat: "Payment", q: "What payment methods do you accept?", a: "Currently we accept Cash on Delivery (COD). Online payment options including credit/debit cards and JazzCash/EasyPaisa are coming soon!" },
  { cat: "Payment", q: "Can I get a refund?", a: "If there's an issue with your order, please contact us within 30 minutes of delivery. We'll resolve it with a refund or replacement." },
  { cat: "Account", q: "How do I create an account?", a: "Click 'Sign In' in the header, then select 'Sign Up'. Enter your email, password, and name to create your account." },
  { cat: "Account", q: "I forgot my password. What do I do?", a: "Click 'Forgot Password' on the login page. We'll send a reset link to your email address." },
  { cat: "Account", q: "How do I update my profile?", a: "Go to your Profile page from the header menu. You can update your name, phone number, and delivery address." },
  { cat: "Food", q: "Are your ingredients halal?", a: "Yes, 100%. All our meat and ingredients are certified halal and freshly sourced." },
  { cat: "Food", q: "Do you cater for allergies?", a: "Please mention any allergies in the special instructions. Our team will ensure your food is prepared safely." },
];

const categories = ["All", ...new Set(faqData.map(f => f.cat))];

const FAQPage = () => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");

  const filtered = faqData.filter(f => {
    const matchSearch = f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === "All" || f.cat === activeCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Got questions? We've got answers. Can't find what you're looking for? Contact us!
            </p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto mb-10 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-full text-lg" />
          </motion.div>

          {/* Category filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 mb-10">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeCat === cat
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card text-foreground hover:bg-primary/10 border border-border"}`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* FAQ List */}
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {filtered.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                  <AccordionItem value={`faq-${i}`} className="bg-card rounded-xl border border-border px-6 shadow-sm hover:shadow-md transition-shadow">
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-5">
                      <span className="flex items-center gap-3">
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{f.cat}</span>
                        {f.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">No questions found matching your search.</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mt-16 p-10 bg-card rounded-3xl shadow-lg border border-border">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-3">Still have questions?</h3>
            <p className="text-muted-foreground mb-6">Our support team is always here to help!</p>
            <Link to="/contact"><Button size="lg" className="rounded-full px-10">Contact Us</Button></Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
