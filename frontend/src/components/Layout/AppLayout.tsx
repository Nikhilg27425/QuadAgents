import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/Layout/BottomNav";

export default function AppLayout() {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <BottomNav />
      <Outlet />
    </div>
  );
}
