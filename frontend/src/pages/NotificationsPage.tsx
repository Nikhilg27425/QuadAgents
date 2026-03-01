import React, { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import { Bell, AlertTriangle, Info, CheckCircle, RefreshCw } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success";
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", title: "मौसम चेतावनी", message: "अगले 48 घंटों में आपके क्षेत्र में भारी बारिश की संभावना है। फसल की सुरक्षा करें।", type: "alert", time: "आज, 9:00 बजे", read: false },
  { id: "2", title: "PM-KISAN किस्त", message: "आपके खाते में ₹2000 की नई किस्त जमा हो गई है।", type: "success", time: "आज, 7:30 बजे", read: false },
  { id: "3", title: "नई योजना", message: "मृदा स्वास्थ्य कार्ड के लिए आवेदन शुरू हो गए हैं। 31 मार्च तक आवेदन करें।", type: "info", time: "कल, 2:00 बजे", read: true },
  { id: "4", title: "फसल बीमा रिमाइंडर", message: "आपकी गेहूं की फसल का बीमा 15 फरवरी को समाप्त हो रहा है।", type: "alert", time: "2 दिन पहले", read: true },
  { id: "5", title: "KCC आवेदन स्वीकृत", message: "आपका किसान क्रेडिट कार्ड आवेदन स्वीकृत हो गया है।", type: "success", time: "3 दिन पहले", read: true },
];

const typeConfig = {
  alert: { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  info: { icon: Info, bg: "bg-primary-light", text: "text-primary", border: "border-primary/20" },
  success: { icon: CheckCircle, bg: "bg-secondary-light", text: "text-secondary", border: "border-secondary/20" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/notifications");
      setNotifications(res.data);
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      {/* Header */}
      <div className="gradient-hero px-5 py-5 text-primary-foreground flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">सूचनाएं</h2>
          {unread > 0 && (
            <p className="text-sm opacity-80">{unread} नई सूचनाएं</p>
          )}
        </div>
        <button
          onClick={fetchNotifications}
          className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card-krishi p-4 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton-pulse w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-pulse h-4 w-2/3" />
                  <div className="skeleton-pulse h-3 w-full" />
                  <div className="skeleton-pulse h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell size={48} className="mb-3 opacity-30" />
            <p className="text-lg font-medium">कोई सूचना नहीं</p>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const config = typeConfig[notif.type];
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`card-krishi p-4 flex gap-3 animate-fade-in ${!notif.read ? "border-l-4 border-l-primary" : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={config.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{notif.time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
