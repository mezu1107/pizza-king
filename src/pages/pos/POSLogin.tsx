import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanLine, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAManifest } from "@/hooks/usePWAInstall";
import { BUSINESS } from "@/lib/contact";

export default function POSLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  usePWAManifest("/manifest-pos.json");

  const from = (location.state as { from?: string } | null)?.from || "/pos";

  useEffect(() => {
    // Already signed in with an admin role? send them straight in.
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (data) navigate(from, { replace: true });
      });
  }, [user, from, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !authData.user) {
      toast({
        title: "Login failed",
        description: error?.message || "Invalid credentials",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      toast({
        title: "Access denied",
        description: "This account has no POS access. Contact the admin.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({ title: "Welcome to POS 🧾" });
    navigate(from, { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">POS Terminal Login</h1>
            <p className="text-muted-foreground mt-1">{BUSINESS.name}</p>
            <p className="text-xs italic text-primary/80 mt-1">Fast Food • Big Taste • Young Vibes</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="pos-email" className="flex items-center gap-2 mb-1.5">
                <Mail className="w-4 h-4" /> Email
              </Label>
              <Input
                id="pos-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pos.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="pos-password" className="flex items-center gap-2 mb-1.5">
                <Lock className="w-4 h-4" /> Password
              </Label>
              <div className="relative">
                <Input
                  id="pos-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Signing in…" : "Sign in to POS"}
            </Button>
          </form>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-6">
            <ShieldCheck className="w-3.5 h-3.5" /> POS accounts are managed from the admin panel.
          </p>
          <p className="text-center text-sm text-muted-foreground mt-3">
            <Link to="/" className="text-primary hover:underline">
              ← Back to website
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
