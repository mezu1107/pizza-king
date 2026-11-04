import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Settings {
  restaurant_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  opening_hours_weekday: string;
  opening_hours_weekend: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
}

const ContactPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("website_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as unknown as Settings);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    // Simulate sending - in production you'd use an edge function
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Message Sent! ✉️", description: "We'll get back to you soon." });
    setName("");
    setEmail("");
    setMessage("");
    setSending(false);
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Us",
      detail: settings?.address || "Mankiala, Rawalpindi, Pakistan",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Phone,
      title: "Call Us",
      detail: settings?.contact_phone || "0349 8190030",
      color: "bg-green-500/10 text-green-600",
    },
    {
      icon: Mail,
      title: "Email Us",
      detail: settings?.contact_email || "info@theyoungmalang.com",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      icon: Clock,
      title: "Opening Hours",
      detail: `Mon-Fri: ${settings?.opening_hours_weekday || "11 AM – 11 PM"} | Sat-Sun: ${settings?.opening_hours_weekend || "12 PM – 12 AM"}`,
      color: "bg-purple-500/10 text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero Banner */}
        <section
          className="relative py-20 md:py-28"
          style={{
            background:
              "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80') center/cover no-repeat",
          }}
        >
          <div className="container mx-auto px-5 lg:px-12 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-heading font-extrabold text-primary-foreground mb-4"
            >
              Get In Touch
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto"
            >
              We'd love to hear from you! Reach out for orders, feedback, or partnership inquiries.
            </motion.p>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-5 lg:px-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-20 md:-mt-16 relative z-10">
              {contactInfo.map((info, i) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow duration-300 border border-border/50"
                >
                  <div className={`w-14 h-14 rounded-2xl ${info.color} flex items-center justify-center mx-auto mb-4`}>
                    <info.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-lg mb-2">{info.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{info.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form + Map */}
        <section className="pb-20">
          <div className="container mx-auto px-5 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
              {/* Form */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Send a Message</h2>
                    <p className="text-muted-foreground text-sm">We usually reply within 24 hours</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="contact-name" className="mb-1.5 block">Your Name</Label>
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="h-12 rounded-xl"
                        required
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email" className="mb-1.5 block">Email Address</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-12 rounded-xl"
                        required
                        maxLength={255}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact-message" className="mb-1.5 block">Message</Label>
                    <Textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message here..."
                      className="min-h-[160px] rounded-xl resize-none"
                      required
                      maxLength={1000}
                    />
                  </div>
                  <Button type="submit" className="w-full h-13 rounded-xl font-bold text-lg gap-2" disabled={sending}>
                    <Send className="w-5 h-5" />
                    {sending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </motion.div>

              {/* Map */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="rounded-2xl overflow-hidden shadow-xl border border-border/50 min-h-[400px] lg:min-h-0"
              >
                <iframe
                  src="https://www.google.com/maps?q=Mankiala%2C%20Rawalpindi%2C%20Pakistan&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "450px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Pizza King Location"
                />
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
