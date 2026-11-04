import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, ChefHat } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We've sent you a password reset link." });
      }
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back! 🎉" });
        navigate("/");
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account Created! 🎉", description: "You can now sign in." });
        setMode("login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
        <div className="container mx-auto px-5 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="bg-card rounded-3xl shadow-2xl p-8 md:p-10 border border-border"
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <ChefHat className="w-8 h-8 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-heading font-extrabold text-foreground">
                {mode === "login" ? "Welcome Back!" : mode === "signup" ? "Join Us!" : "Reset Password"}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {mode === "login"
                  ? "Sign in to order your favorite food"
                  : mode === "signup"
                  ? "Create your Pizza King account"
                  : "Enter your email to receive a reset link"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <Label htmlFor="fullName" className="flex items-center gap-2 mb-1.5 text-sm">
                    <User className="w-4 h-4" /> Full Name
                  </Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name" required className="h-12 rounded-xl" />
                </motion.div>
              )}

              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-1.5 text-sm">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required className="h-12 rounded-xl" />
              </div>

              {mode !== "forgot" && (
                <div>
                  <Label htmlFor="password" className="flex items-center gap-2 mb-1.5 text-sm">
                    <Lock className="w-4 h-4" /> Password
                  </Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      required minLength={6} className="h-12 rounded-xl pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full rounded-full h-12 text-lg font-semibold" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign In"
                  : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              {mode === "forgot" && (
                <button onClick={() => setMode("login")} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 justify-center mx-auto">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              )}
              {mode === "login" && (
                <p className="text-muted-foreground text-sm">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Sign Up</button>
                </p>
              )}
              {mode === "signup" && (
                <p className="text-muted-foreground text-sm">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Sign In</button>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
