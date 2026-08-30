"use client";

import React from "react";
import { ArrowRight, BookOpen, Compass, Shield, Lock, Check } from "lucide-react";

interface LandingViewProps {
  onSignIn: () => void;
  isLoading: boolean;
  error: string | null;
}

export function LandingView({ onSignIn, isLoading, error }: LandingViewProps) {
  return (
    <div className="min-h-screen bg-[#0c0c0d] text-[#e4e4e7] flex flex-col justify-between selection:bg-[#d4ff33] selection:text-[#0c0c0d]">
      {/* Navigation Header */}
      <header className="border-b-[1.5px] border-[#e4e4e7] bg-[#0c0c0d]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div>
            <h1 className="font-syne font-extrabold text-2xl tracking-[-0.04em] text-[#e4e4e7] uppercase leading-none">
              Aether
            </h1>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[rgba(228,228,231,0.5)] block mt-1">
              Intelligent Reflections
            </span>
          </div>

          <button
            id="header-sign-in-btn"
            onClick={onSignIn}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#d4ff33] hover:bg-[#e2ff66] active:scale-95 text-[#0c0c0d] font-syne font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-60 shadow-md"
          >
            <span>Sign In with Google</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Hero & Authentication Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 sm:px-8 py-16 md:py-24 flex flex-col items-center text-center justify-center">
        {/* Security / Privacy Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[rgba(228,228,231,0.2)] bg-[#141415] text-[#d4ff33] text-[10px] uppercase tracking-[0.15em] font-mono mb-8">
          <Shield className="w-3.5 h-3.5 text-[#d4ff33]" />
          <span>Private & Isolated via Firestore Rules</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-syne font-extrabold text-[#e4e4e7] tracking-tight max-w-4xl leading-[1.05] uppercase">
          A sanctuary for <span className="text-[#d4ff33]">intelligent reflections</span> and clarity.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm md:text-base text-[rgba(228,228,231,0.6)] max-w-xl leading-relaxed font-sans">
          Capture multi-turn introspections and synthesize your thoughts with Gemini 3.6 Flash. Grounded with structured takeaways, cognitive reframing, and end-to-end user isolation.
        </p>

        {/* Error Banner */}
        {error && (
          <div className="mt-6 max-w-md w-full p-4 bg-[#18181b] border border-red-500/40 text-red-400 text-xs text-left font-mono">
            <span className="font-bold text-red-300">AUTHENTICATION ERROR: </span>
            {error}
          </div>
        )}

        {/* Primary Call to Action */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            id="hero-google-signin-btn"
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#d4ff33] hover:bg-[#e2ff66] active:scale-98 text-[#0c0c0d] font-syne font-bold uppercase tracking-wider text-sm transition-all cursor-pointer disabled:opacity-60 shadow-xl group"
          >
            {/* Google Icon SVG */}
            <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isLoading ? "CONNECTING SESSION..." : "CONTINUE WITH GOOGLE"}</span>
            <ArrowRight className="w-4 h-4 text-[#0c0c0d] group-hover:translate-x-1 transition-transform stroke-[2.5]" />
          </button>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          <div className="p-6 bg-[#141415] border border-[rgba(228,228,231,0.1)] hover:border-[#d4ff33] transition-colors">
            <div className="w-8 h-8 bg-[#18181b] border border-[rgba(228,228,231,0.1)] text-[#d4ff33] flex items-center justify-center mb-4">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold font-syne uppercase tracking-wide text-[#e4e4e7] mb-1">
              Philosophical Inquiry
            </h2>
            <p className="text-xs text-[rgba(228,228,231,0.5)] leading-relaxed font-sans">
              Explore decisions, ambitions, and friction points through deep Socratic inquiry.
            </p>
          </div>

          <div className="p-6 bg-[#141415] border border-[rgba(228,228,231,0.1)] hover:border-[#d4ff33] transition-colors">
            <div className="w-8 h-8 bg-[#18181b] border border-[rgba(228,228,231,0.1)] text-[#d4ff33] flex items-center justify-center mb-4">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold font-syne uppercase tracking-wide text-[#e4e4e7] mb-1">
              Synthesis & Framing
            </h2>
            <p className="text-xs text-[rgba(228,228,231,0.5)] leading-relaxed font-sans">
              Transform stream-of-consciousness journaling into structured lessons and action steps.
            </p>
          </div>

          <div className="p-6 bg-[#141415] border border-[rgba(228,228,231,0.1)] hover:border-[#d4ff33] transition-colors">
            <div className="w-8 h-8 bg-[#18181b] border border-[rgba(228,228,231,0.1)] text-[#d4ff33] flex items-center justify-center mb-4">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold font-syne uppercase tracking-wide text-[#e4e4e7] mb-1">
              Firestore User Isolation
            </h2>
            <p className="text-xs text-[rgba(228,228,231,0.5)] leading-relaxed font-sans">
              Owner-bound rules guarantee records are readable only by your authenticated account.
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-5 text-xs text-[rgba(228,228,231,0.4)] font-mono">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#d4ff33]" />
            <span>ZERO PASSWORDS STORED</span>
          </div>
          <span className="hidden sm:inline text-[rgba(228,228,231,0.2)]">•</span>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#d4ff33]" />
            <span>GEMINI 3.6 FLASH RESILIENT LADDER</span>
          </div>
          <span className="hidden sm:inline text-[rgba(228,228,231,0.2)]">•</span>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#d4ff33]" />
            <span>FIRESTORE SECURED</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-[1.5px] border-[#e4e4e7] bg-[#0c0c0d] py-6 text-center text-xs text-[rgba(228,228,231,0.5)]">
        <p className="font-mono text-[10px] uppercase tracking-widest">
          Aether Intelligent Reflection Engine • Google Cloud Run & Firestore
        </p>
      </footer>
    </div>
  );
}


