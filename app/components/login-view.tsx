"use client";

import React, { useState } from "react";
import { Sparkles, Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("niteen@propai.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // Simulate authentic authentication delay
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("proposalizer_auth_token", "demo-token-active-session");
      localStorage.setItem("proposalizer_user_email", email);
      onLoginSuccess(email);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* Background Glowing Aura Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-glow-orb-1 rounded-full filter blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-glow-orb-2 rounded-full filter blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-glow-orb-3 rounded-full filter blur-[100px] pointer-events-none opacity-40" />

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 glass rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 hover:border-white/15 transition-all duration-300">
        
        {/* Branding Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] mb-4">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            Prop<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Access your AI proposal generator & workspace
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 px-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="email"
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/50 rounded-xl border border-white/8 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <span className="text-[10px] text-slate-500 cursor-not-allowed hover:underline">
                Forgot password?
              </span>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 bg-slate-950/50 rounded-xl border border-white/8 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 py-1 px-1">
            <input
              type="checkbox"
              id="remember"
              defaultChecked
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-offset-2"
            />
            <label htmlFor="remember" className="text-xs text-slate-400 select-none cursor-pointer">
              Remember active session
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Establishing secure connection...</span>
              </>
            ) : (
              <>
                <span>Sign In to PropAI</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Mode Badge */}
        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">
            Demo Sandbox Environment
          </p>
          <p className="text-[10px] text-slate-400 italic">
            You can sign in with any email and password
          </p>
        </div>

      </div>
    </div>
  );
}
