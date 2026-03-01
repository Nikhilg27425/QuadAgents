import React, { useEffect, useState } from "react";
import { MessageCircle, TrendingUp, Sprout, Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import apiClient from "@/api/apiClient";
import SchemeCard, { SchemeCardSkeleton } from "@/components/Dashboard/SchemeCard";
import { getErrorMessage } from "@/utils/helpers";

interface DashboardData {
  greeting: string;
  schemes: Array<{
    id: string;
    name: string;
    description: string;
    amount?: string;
    deadline?: string;
    category: string;
  }>;
  recentActivity: Array<{ id: string; text: string; time: string }>;
  notifications: Array<{ id: string; title: string; message: string }>;
  weatherAlert?: string;
}

const MOCK_DATA: DashboardData = {
  greeting: "नमस्ते",
  weatherAlert: "🌤️ आज मौसम साफ रहेगा। सिंचाई के लिए उचित समय है।",
  schemes: [
    { id: "1", name: "PM-KISAN योजना", description: "हर साल ₹6000 की आर्थिक सहायता छोटे और सीमांत किसानों को।", amount: "6,000/वर्ष", deadline: "31 मार्च 2025", category: "subsidy" },
    { id: "2", name: "किसान क्रेडिट कार्ड", description: "कम ब्याज दर पर खेती के लिए ऋण। 4% ब्याज दर पर 3 लाख तक।", amount: "3,00,000", deadline: "30 जून 2025", category: "loan" },
    { id: "3", name: "फसल बीमा योजना", description: "प्राकृतिक आपदा से फसल नुकसान पर मुआवज़ा मिलेगा।", category: "insurance" },
  ],
  recentActivity: [
    { id: "1", text: "आपने गेहूं की फसल के बारे में पूछा", time: "आज, 10:30 बजे" },
    { id: "2", text: "PM-KISAN आवेदन स्थिति देखी", time: "कल, 3:00 बजे" },
    { id: "3", text: "मिट्टी परीक्षण के बारे में जानकारी", time: "3 दिन पहले" },
  ],
  notifications: [
    { id: "1", title: "नई योजना उपलब्ध", message: "मृदा स्वास्थ्य कार्ड के लिए आवेदन शुरू हो गए हैं।" },
    { id: "2", title: "मौसम चेतावनी", message: "अगले 3 दिनों में भारी बारिश की संभावना।" },
  ],
};

export default function DashboardPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get("/dashboard-summary");
        setData(res.data);
      } catch {
        // Use mock data for demo
        setData(MOCK_DATA);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="pb-24 pt-16 min-h-screen bg-background">
      {/* Hero greeting */}
      <div className="gradient-hero px-5 py-6 text-primary-foreground">
        <p className="text-base opacity-80 mb-1">
          {new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h2 className="text-2xl font-bold">
          {data?.greeting || "नमस्ते"}, {user?.name?.split(" ")[0]} जी! 🌾
        </h2>
        {data?.weatherAlert && (
          <div className="mt-3 bg-primary-foreground/10 rounded-xl px-4 py-3 text-sm">
            {data.weatherAlert}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="px-4 -mt-4">
        <div className="card-krishi p-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: MessageCircle, label: "चैट करें", color: "bg-primary-light text-primary", path: "/chat" },
              { icon: TrendingUp, label: "योजनाएं", color: "bg-secondary-light text-secondary", path: "/notifications" },
              { icon: Sprout, label: "प्रोफाइल", color: "bg-accent/10 text-accent", path: "/profile" },
            ].map(({ icon: Icon, label, color, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-2 py-3 rounded-xl hover:opacity-80 transition-opacity"
              >
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scheme suggestions */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-foreground">आपके लिए योजनाएं</h3>
          <button onClick={() => navigate("/notifications")} className="flex items-center text-sm text-primary font-semibold">
            सभी देखें <ChevronRight size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {loading
            ? [1, 2, 3].map((i) => <SchemeCardSkeleton key={i} />)
            : data?.schemes.map((scheme, i) => (
                <SchemeCard key={scheme.id} scheme={scheme} index={i} />
              ))}
        </div>
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      </div>

      {/* Recent activity */}
      <div className="px-4 mt-5">
        <h3 className="text-lg font-bold text-foreground mb-3">हाल की गतिविधि</h3>
        <div className="card-krishi divide-y divide-border">
          {loading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="skeleton-pulse w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-pulse h-4 w-full" />
                    <div className="skeleton-pulse h-3 w-1/3" />
                  </div>
                </div>
              ))
            : data?.recentActivity.map((act) => (
                <div key={act.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{act.text}</p>
                    <p className="text-xs text-muted-foreground">{act.time}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Notification preview */}
      {data?.notifications && data.notifications.length > 0 && (
        <div className="px-4 mt-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">सूचनाएं</h3>
            <button onClick={() => navigate("/notifications")} className="flex items-center text-sm text-primary font-semibold">
              सभी <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {data.notifications.slice(0, 2).map((notif) => (
              <div key={notif.id} className="card-krishi px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell size={16} className="text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{notif.title}</p>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
