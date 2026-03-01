import React from "react";
import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { Home, MessageCircle, User, Bell, LogOut, Leaf } from "lucide-react";
import { useUser } from "@/context/UserContext";

const navItems = [
  { to: "/dashboard", icon: Home, label: "होम" },
  { to: "/chat", icon: MessageCircle, label: "चैट" },
  { to: "/notifications", icon: Bell, label: "सूचनाएं" },
  { to: "/profile", icon: User, label: "प्रोफ़ाइल" },
];

export default function BottomNav() {
  const { logout, user } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
            <Leaf size={18} className="text-primary" />
          </div>
          <span className="text-lg font-bold font-mukta">कृषि सहायक</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{user?.name}</span>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-primary-glow transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-2 flex justify-around safe-area-pb">
        {navItems.map(({ to, icon: Icon, label }) => (
          <RouterNavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </RouterNavLink>
        ))}
      </nav>
    </>
  );
}
