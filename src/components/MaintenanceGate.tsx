import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, Phone, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { BUSINESS } from "@/lib/contact";
import logo from "@/assets/logo.png";

const STAFF_PREFIXES = ["/admin", "/pos", "/rider", "/auth", "/reset-password"];

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { settings } = useSiteSettings();
  const { isAdmin } = useAdminCheck();
  const { pathname } = useLocation();

  const isStaffRoute = STAFF_PREFIXES.some((p) => pathname.startsWith(p));

  if (!settings?.maintenance_mode || isStaffRoute || isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg text-center bg-card border border-border rounded-3xl shadow-xl p-8 md:p-12"
      >
        <img src={logo} alt={settings.restaurant_name} className="w-24 h-24 mx-auto object-contain" />
        <div className="mt-6 inline-flex items-center gap-2 text-primary bg-primary/10 rounded-full px-4 py-1.5 text-sm font-medium">
          <Wrench className="w-4 h-4" /> Maintenance mode
        </div>
        <h1 className="mt-5 text-2xl md:text-3xl font-heading font-bold text-foreground">
          We apologise, we are working on this
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          {settings.maintenance_message || "We will fix it as soon as possible."}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-medium"
          >
            <Phone className="w-4 h-4" /> Call to order
          </a>
          <a
            href={`https://wa.me/${BUSINESS.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 font-medium text-foreground"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">{settings.restaurant_name}</p>
      </motion.div>
    </div>
  );
}
