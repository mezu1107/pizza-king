import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Twitter, ArrowUp, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BUSINESS, DEVELOPER } from "@/lib/contact";

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

const Footer = () => {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    supabase.from("website_settings").select("*").limit(1).single()
      .then(({ data }) => { if (data) setSettings(data as unknown as Settings); });
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="bg-foreground text-background relative">
      <button onClick={scrollToTop}
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
        aria-label="Scroll to top">
        <ArrowUp className="w-5 h-5" />
      </button>

      <div className="container mx-auto px-5 lg:px-12 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-8 h-8 text-primary" />
              <h3 className="font-heading font-extrabold text-2xl">
                Pizza King <span className="text-primary">Malang</span>
              </h3>
            </div>
            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-3">Fast Food Restaurant</p>
            <p className="text-background/70 mb-6 leading-relaxed text-sm">
              Fast Food. Big Taste. Young Vibes. Burgers, pizza, fried chicken, wraps and fries — fired up fresh and delivered hot across Rawalpindi.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, url: settings?.facebook_url },
                { icon: Instagram, url: settings?.instagram_url },
                { icon: Twitter, url: settings?.twitter_url },
              ].map((s, i) => (
                <motion.a key={i} href={s.url || "#"} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -3 }}
                  className="w-10 h-10 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                  <s.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home", to: "/" },
                { label: "Menu", to: "/menu" },
                { label: "Deals", to: "/deals" },
                { label: "About Us", to: "/about" },
                { label: "Contact", to: "/contact" },
                { label: "FAQ", to: "/faq" },
                { label: "Track Order", to: "/track-order" },
                { label: "My Orders", to: "/orders" },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-background/70 hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3.5">
              <li className="flex items-start gap-3 text-background/70 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>{settings?.address || BUSINESS.address}</span>
              </li>
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>{settings?.contact_phone || BUSINESS.phoneIntl}</span>
              </li>
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>{settings?.contact_email || BUSINESS.email}</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Opening Hours</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-background">Mon – Fri</p>
                  <p>{settings?.opening_hours_weekday || "11:00 AM – 11:00 PM"}</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-background">Sat – Sun</p>
                  <p>{settings?.opening_hours_weekend || "12:00 PM – 12:00 AM"}</p>
                </div>
              </li>
            </ul>

            {/* Payment */}
            <div className="mt-6">
              <h4 className="font-heading font-bold text-sm mb-3">We Accept</h4>
              <div className="flex gap-2 text-2xl">
                <span>💵</span><span>💳</span><span>📱</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-background/50 text-sm">
          <div className="text-center md:text-left">
            <p>© {new Date().getFullYear()} {settings?.restaurant_name || BUSINESS.name}. All rights reserved.</p>
            <p className="text-[11px] text-background/40 mt-1">
              Website &amp; Software Developed by {DEVELOPER.name} · {DEVELOPER.phone}
            </p>
          </div>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
