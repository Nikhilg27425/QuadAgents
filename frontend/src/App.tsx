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

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("id_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("id_token");

      if (token) {
        localStorage.setItem("token", token);
        window.location.hash = "";
        window.location.replace("/dashboard");
      }
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
