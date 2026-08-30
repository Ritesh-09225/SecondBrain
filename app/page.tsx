"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { LandingView } from "@/components/LandingView";
import { DashboardView } from "@/components/DashboardView";
import { Sparkles, RefreshCw } from "lucide-react";

export default function HomePage() {
  const { user, loading, error, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0F1012] text-[#D1D1D1]">
        <div className="w-12 h-12 rounded-xl bg-[#1A1B1E] border border-[#2A2B2E] flex items-center justify-center text-[#C1A47E] mb-4 shadow-2xl animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#888]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C1A47E]" />
          <span>Initializing secure session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingView
        onSignIn={signInWithGoogle}
        isLoading={loading}
        error={error}
      />
    );
  }

  return <DashboardView />;
}
