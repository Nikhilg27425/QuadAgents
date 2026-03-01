import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithCognito, storeAuth } from "@/api/auth";
import { useUser } from "@/context/UserContext";
import { Leaf, Phone, Lock, Eye, EyeOff, UserRound } from "lucide-react";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useUser();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone || !password) {
      setError("कृपया सभी जानकारी भरें।");
      return;
    }
    if (name.trim().length < 2) {
      setError("कृपया सही नाम डालें।");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await loginWithCognito({ username: phone, password });
      // Override name with what user typed
      result.user.name = name.trim();
      storeAuth(result);
      setAuth(result.user, result.token);
      navigate("/dashboard");
    } catch {
      setError("गलत नंबर या पासवर्ड। कृपया दोबारा कोशिश करें।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-primary-foreground">
        <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6 shadow-lg">
          <Leaf size={40} className="text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-center mb-2">कृषि सहायक</h1>
        <p className="text-lg text-center opacity-90 font-medium">Krishi Sahaayak</p>
        <p className="text-base text-center opacity-70 mt-2 max-w-xs">
          आपका AI-powered खेती सहायक
        </p>
      </div>

      {/* Login card */}
      <div className="bg-background rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-1">लॉगिन करें</h2>
        <p className="text-muted-foreground mb-6">अपना नाम, नंबर और पासवर्ड डालें</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-base font-semibold text-foreground mb-2">
              आपका नाम
            </label>
            <div className="relative">
              <UserRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="जैसे: रमेश कुमार"
                maxLength={80}
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-foreground mb-2">
              मोबाइल नंबर
            </label>
            <div className="relative">
              <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-foreground mb-2">
              पासवर्ड
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>लॉगिन हो रहा है...</span>
              </>
            ) : (
              "लॉगिन करें"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          किसी भी नंबर और पासवर्ड से लॉगिन करें (Demo)
        </p>
      </div>
    </div>
  );
}
