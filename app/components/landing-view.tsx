"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  FileText,
  BarChart3,
  Mail,
  Users,
  Shield,
  ChevronRight,
  Zap,
} from "lucide-react";

interface LandingViewProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function LandingView({ onGetStarted, onSignIn }: LandingViewProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ─── NAVBAR ─── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s ease",
          background: scrollY > 50 ? "rgba(255,255,255,0.85)" : "transparent",
          backdropFilter: scrollY > 50 ? "blur(12px)" : "none",
          borderBottom: scrollY > 50 ? "1px solid #eee" : "none",
        }}
      >
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: "#111" }}>
              Prop<span style={{ color: "#666" }}>AI</span>
            </span>
          </div>

          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {["Home", "Features", "How It Works", "Pricing"].map((item) => (
              <a
                key={item}
                href="#"
                style={{ fontSize: 14, fontWeight: 500, color: "#666", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
              >
                {item}
              </a>
            ))}
            <button
              onClick={onSignIn}
              style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#111", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#ccc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd"; }}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" }}>
        {/* Background illustration */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/hero-bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
            opacity: 0.12,
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        />
        {/* Subtle grain overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 70%, #fff 100%)" }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 10, padding: "0 24px", maxWidth: 720 }}>
          {/* Badge */}
          <div
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 50, background: "#f5f5f5", border: "1px solid #eee", color: "#555", fontSize: 12, fontWeight: 600, marginBottom: 28 }}
          >
            <Zap style={{ width: 13, height: 13, color: "#111" }} />
            AI-Powered Proposal Engine
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(38px, 5.5vw, 58px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, marginBottom: 18, color: "#111" }}>
            Craft winning proposals.
            <br />
            <span style={{ color: "#888" }}>Land more clients.</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#777", maxWidth: 520, margin: "0 auto 36px" }}>
            Paste any job post. PropAI parses it, scores your match, and generates
            tailored cold emails and proposals — instantly.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={onGetStarted}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#111"; }}
            >
              Get Started Free
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>

            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#555", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f9f9f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              See How It Works
            </button>
          </div>

          {/* Trust */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 48, color: "#bbb", fontSize: 12, fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Shield style={{ width: 13, height: 13 }} /> Secure & Private</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ddd" }} />
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Users style={{ width: 13, height: 13 }} /> 2,400+ Users</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ddd" }} />
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Zap style={{ width: 13, height: 13 }} /> AI Powered</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2.5, color: "#999", marginBottom: 10 }}>Features</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: -0.8, color: "#111", marginBottom: 12 }}>
            Everything you need to <span style={{ color: "#888" }}>win outreach</span>
          </h2>
          <p style={{ fontSize: 15, color: "#999", maxWidth: 460, margin: "0 auto" }}>
            From parsing job posts to generating personalized proposals — PropAI handles the heavy lifting.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20 }}>
          {[
            { icon: FileText, title: "Smart Job Parsing", desc: "Paste any job post and our AI extracts role, company, contact info, and key requirements instantly." },
            { icon: BarChart3, title: "Match Scoring", desc: "Your skills are automatically compared against job requirements to generate a real-time match percentage." },
            { icon: Mail, title: "AI Cold Emails", desc: "Generate professional, personalized cold emails, LinkedIn messages, and cover letters in seconds." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{ padding: 28, borderRadius: 14, background: "#fafafa", border: "1px solid #eee", transition: "all 0.25s", cursor: "default" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0f0f0", border: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon style={{ width: 18, height: 18, color: "#555" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#888" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: "60px 24px 100px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "56px 36px", borderRadius: 18, background: "#fafafa", border: "1px solid #eee" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: "#111", marginBottom: 12 }}>
            Ready to land your next gig?
          </h2>
          <p style={{ fontSize: 15, color: "#999", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
            Join thousands of professionals using PropAI to craft winning proposals.
          </p>
          <button
            onClick={onGetStarted}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#111"; }}
          >
            Create Free Account
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: "1px solid #eee", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles style={{ width: 11, height: 11, color: "#fff" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Prop<span style={{ color: "#888" }}>AI</span></span>
        </div>
        <p style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>© 2026 PropAI. Built for professionals.</p>
      </footer>
    </div>
  );
}
