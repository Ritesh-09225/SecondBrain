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
      <div
        style={{ backgroundColor: '#0c0c0d', color: '#e4e4e7', minHeight: '100vh' }}
        className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0c0c0d] text-[#e4e4e7] selection:bg-[#d4ff33] selection:text-[#0c0c0d] px-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#141415] border border-[rgba(228,228,231,0.2)] flex items-center justify-center text-[#d4ff33] mb-6 shadow-2xl animate-pulse">
          <Sparkles className="w-6 h-6 text-[#d4ff33]" />
        </div>
        <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-[rgba(228,228,231,0.7)]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#d4ff33]" />
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
