import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {

  const { isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
