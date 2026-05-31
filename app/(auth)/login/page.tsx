"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, EyeOff, Lock, Mail, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useLoginForm } from "../../hooks/useLoginForm";

export default function LoginPage() {
  const router = useRouter();
  const f = useLoginForm();

  return (
    <>
      <style>{`
        .lp-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: #f5f5f5; padding: 24px 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .lp-back {
          position: fixed; top: 20px; left: 20px; display: flex; align-items: center; gap: 5px;
          color: #aaa; font-size: 13px; font-weight: 500; background: none; border: none;
          cursor: pointer; z-index: 50; transition: color 0.2s;
        }
        .lp-back:hover { color: #111; }
        .lp-card {
          width: 100%; max-width: 420px; background: #fff; border-radius: 20px;
          border: 1px solid #e8e8e8; box-shadow: 0 8px 36px rgba(0,0,0,0.07);
          padding: 36px 32px;
        }
        .lp-brand { text-align: center; margin-bottom: 28px; }
        .lp-logo {
          width: 44px; height: 44px; border-radius: 12px; background: #111;
          display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;
        }
        .lp-brand h1 { font-size: 22px; font-weight: 700; color: #111; margin: 0; }
        .lp-brand p  { font-size: 13px; color: #aaa; margin: 4px 0 0; }
        .lp-error {
          margin-bottom: 16px; padding: 10px 14px; border-radius: 10px;
          background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
          font-size: 12px; text-align: center; font-weight: 500;
        }
        .lp-field { display: flex; flex-direction: column; gap: 5px; }
        .lp-field label { font-size: 12px; font-weight: 600; color: #888; }
        .lp-fw { position: relative; }
        .lp-fi {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; color: #c0c0c0; pointer-events: none;
        }
        .lp-input {
          width: 100%; box-sizing: border-box; padding: 12px 12px 12px 38px;
          border-radius: 10px; border: 1.5px solid #e8e8e8; background: #f8f8f8;
          color: #111; font-size: 14px; outline: none; transition: all 0.2s;
          font-family: inherit; -webkit-appearance: none;
        }
        .lp-input:focus { border-color: #111; background: #fff; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        .lp-input::placeholder { color: #c0c0c0; }
        .lp-input.pr { padding-right: 40px; }
        .lp-pwtoggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #ccc; padding: 4px; display: flex;
        }
        .lp-pwtoggle:hover { color: #888; }
        .lp-btn {
          width: 100%; padding: 13px 0; border-radius: 11px; border: none;
          background: #111; color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 7px; transition: all 0.2s; font-family: inherit; -webkit-appearance: none;
        }
        .lp-btn:hover:not(:disabled) { background: #333; }
        .lp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lp-switch { text-align: center; margin-top: 20px; font-size: 13px; color: #aaa; }
        .lp-switch button {
          background: none; border: none; color: #111; font-weight: 700;
          cursor: pointer; font-size: 13px; text-decoration: underline; text-underline-offset: 3px;
        }
        .lp-divider {
          display: flex; align-items: center; gap: 12px; margin: 20px 0;
          color: #ddd; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
        }
        .lp-divider span { flex: 1; height: 1px; background: #eee; }
        @keyframes lp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lp-spin { animation: lp-spin 0.8s linear infinite; }
      `}</style>

      <div className="lp-page">
        <button onClick={() => router.push("/")} className="lp-back">
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back
        </button>

        <div className="lp-card">
          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-logo">
              <Sparkles style={{ width: 20, height: 20, color: "#fff" }} />
            </div>
            <h1>Prop<span style={{ color: "#888" }}>AI</span></h1>
            <p>Sign in to your workspace</p>
          </div>

          {/* Error */}
          {f.error && <div className="lp-error">{f.error}</div>}

          {/* Form */}
          <form onSubmit={f.handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="lp-field">
              <label>Email address</label>
              <div className="lp-fw">
                <Mail className="lp-fi" />
                <input
                  className="lp-input"
                  type="email" required
                  value={f.email}
                  onChange={e => f.setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="lp-field">
              <label>Password</label>
              <div className="lp-fw">
                <Lock className="lp-fi" />
                <input
                  className="lp-input pr"
                  type={f.showPassword ? "text" : "password"}
                  required
                  value={f.password}
                  onChange={e => f.setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="lp-pwtoggle" onClick={() => f.setShowPassword(!f.showPassword)}>
                  {f.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={f.loading} style={{ marginTop: 6 }}>
              {f.loading
                ? <><Loader2 className="lp-spin" style={{ width: 15, height: 15 }} /><span>Signing in...</span></>
                : <><span>Sign In</span><ArrowRight style={{ width: 15, height: 15 }} /></>}
            </button>
          </form>

          <div className="lp-switch">
            Don&apos;t have an account?{" "}
            <button onClick={() => router.push("/signup")}>Create Account</button>
          </div>
        </div>
      </div>
    </>
  );
}
