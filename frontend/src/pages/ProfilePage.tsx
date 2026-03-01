import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import apiClient from "@/api/apiClient";
import { INDIAN_STATES, CROPS, LANGUAGES, getErrorMessage } from "@/utils/helpers";
import { User, Save, ChevronDown } from "lucide-react";

interface ProfileData {
  name: string;
  phone: string;
  state: string;
  district: string;
  crop: string;
  landSize: string;
  preferredLanguage: string;
}

export default function ProfilePage() {
  const { user, setPreferredLanguage } = useUser();
  const [profile, setProfile] = useState<ProfileData>({
    name: user?.name || "",
    phone: user?.phone || "",
    state: "उत्तर प्रदेश",
    district: "लखनऊ",
    crop: "गेहूं",
    landSize: "2",
    preferredLanguage: user?.preferredLanguage || "hi",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get("/profile").then((res) => {
      setProfile((p) => ({ ...p, ...res.data }));
    }).catch(() => {
      // use defaults
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await apiClient.put("/profile", profile);
      setPreferredLanguage(profile.preferredLanguage);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof ProfileData, type = "text") => (
    <div key={key}>
      <label className="block text-base font-semibold text-foreground mb-2">{label}</label>
      <input
        type={type}
        value={profile[key]}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  const select = (label: string, key: keyof ProfileData, options: string[] | { code: string; name: string }[]) => (
    <div key={key}>
      <label className="block text-base font-semibold text-foreground mb-2">{label}</label>
      <div className="relative">
        <select
          value={profile[key]}
          onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
        >
          {(options as Array<string | { code: string; name: string }>).map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>{opt}</option>
            ) : (
              <option key={opt.code} value={opt.code}>{opt.name}</option>
            )
          )}
        </select>
        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      {/* Header */}
      <div className="gradient-hero px-5 py-6 text-primary-foreground flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
          <User size={32} className="text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile.name}</h2>
          <p className="opacity-80">{profile.phone}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="px-4 mt-5 space-y-4">
        <h3 className="text-lg font-bold text-foreground">प्रोफाइल जानकारी</h3>

        <div className="card-krishi p-4 space-y-4">
          {field("नाम", "name")}
          {field("मोबाइल नंबर", "phone", "tel")}
          {select("राज्य", "state", INDIAN_STATES)}
          {field("जिला", "district")}
          {select("मुख्य फसल", "crop", CROPS)}

          <div>
            <label className="block text-base font-semibold text-foreground mb-2">
              खेत का आकार (एकड़)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={profile.landSize}
              onChange={(e) => setProfile((p) => ({ ...p, landSize: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {select("पसंदीदा भाषा", "preferredLanguage", LANGUAGES)}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-primary-light border border-primary/20 text-primary rounded-xl px-4 py-3 text-sm font-medium">
            ✅ प्रोफाइल सहेज ली गई!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {loading ? "सहेज रहे हैं..." : "सहेजें"}
        </button>
      </form>
    </div>
  );
}
