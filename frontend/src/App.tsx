import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { ChatProvider } from "@/context/ChatContext";
import ProtectedRoute from "@/components/Layout/ProtectedRoute";
import AppLayout from "@/components/Layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Extract tokens IMMEDIATELY before any routing happens
  const hash = window.location.hash;
  
  if (hash.includes("id_token") || hash.includes("access_token")) {
    console.log("✅ Found tokens in URL hash, extracting...");
    const params = new URLSearchParams(hash.substring(1));
    const idToken = params.get("id_token");
    const accessToken = params.get("access_token");
    
    const token = idToken || accessToken;
    if (token) {
      console.log("💾 Saving token to localStorage");
      localStorage.setItem("token", token);
      // Clean URL and redirect to dashboard
      window.history.replaceState({}, document.title, "/dashboard");
    }
  }

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    console.log("🔍 App.tsx - Current URL:", window.location.href);
    console.log("🔍 Hash:", hash);
    console.log("🔍 Search params:", search);
    console.log("🔍 Current token in localStorage:", localStorage.getItem("token"));

    if (search.includes("code=")) {
      // Authorization code flow - not supported yet
      console.log("⚠️ Found authorization code in URL - this flow is not implemented");
      const params = new URLSearchParams(search);
      const code = params.get("code");
      console.log("📝 Authorization code:", code?.substring(0, 20) + "...");
    } else if (!hash.includes("id_token") && !hash.includes("access_token")) {
      console.log("ℹ️ No tokens found in URL");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ChatProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>

                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />

              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ChatProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
