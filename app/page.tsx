"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, FileText, BarChart3, Mail,
  Users, Shield, ChevronRight, Zap,
} from "lucide-react";

export default function LandingPage() {
  const router  = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrolled = scrollY > 50;

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          transition: "all 0.3s ease",
          background: scrolled ? "rgba(255,255,255,0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid #eee" : "none",
        }}
      >
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
              Prop<span style={{ color: "#888" }}>AI</span>
            </span>
          </div>

          {/* Nav actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[
              { label: "Features",     href: "#features" },
              { label: "How It Works", href: "#how" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{ fontSize: 13, fontWeight: 500, color: "#666", textDecoration: "none", padding: "6px 12px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#111"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#666"; }}
              >
                {label}
              </a>
            ))}
            <button
              onClick={() => router.push("/login")}
              style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#111", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#ccc"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd"; }}
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/signup")}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#333"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#111"; }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" }}
      >
        {/* Parallax BG */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url(/hero-bg.png)",
            backgroundSize: "cover", backgroundPosition: "center bottom",
            opacity: 0.1,
            transform: `translateY(${scrollY * 0.18}px)`,
          }}
        />
        {/* Gradient fade */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.55) 70%,#fff 100%)" }} />

        <div style={{ position: "relative", zIndex: 10, padding: "0 24px", maxWidth: 700 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 50, background: "#f5f5f5", border: "1px solid #eee", color: "#555", fontSize: 12, fontWeight: 600, marginBottom: 30 }}>
            <Zap style={{ width: 13, height: 13, color: "#111" }} />
            AI-Powered Proposal Engine
          </div>

          <h1 style={{ fontSize: "clamp(38px, 5.5vw, 60px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 20 }}>
            Craft winning proposals.{" "}
            <br />
            <span style={{ color: "#999" }}>Land more clients.</span>
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#888", maxWidth: 500, margin: "0 auto 36px" }}>
            Paste any job post. PropAI parses it, scores your match, and generates
            tailored cold emails and proposals — instantly.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/signup")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 30px", borderRadius: 11, border: "none", background: "#111", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 18px rgba(0,0,0,0.12)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#333"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#111"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.12)"; }}
            >
              Get Started — It&apos;s Free <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: 11, border: "1px solid #e0e0e0", background: "#fff", color: "#555", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "#ccc"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e0e0e0"; }}
            >
              See How It Works
            </button>
          </div>

          {/* Trust row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 52, color: "#bbb", fontSize: 12, fontWeight: 500 }}>
            {[
              { icon: Shield, text: "Secure & Private" },
              { icon: Users,  text: "2,400+ Users" },
              { icon: Zap,    text: "AI Powered" },
            ].map(({ icon: Icon, text }, i) => (
              <React.Fragment key={text}>
                {i > 0 && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ddd" }} />}
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon style={{ width: 13, height: 13 }} /> {text}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#bbb", marginBottom: 12 }}>What you get</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: -0.8, color: "#111", marginBottom: 14 }}>
            Everything you need to <span style={{ color: "#999" }}>win outreach</span>
          </h2>
          <p style={{ fontSize: 15, color: "#aaa", maxWidth: 440, margin: "0 auto" }}>
            From parsing job posts to generating personalized proposals — PropAI handles the heavy lifting.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { icon: FileText, title: "Smart Job Parsing",  desc: "Paste any job post and our AI extracts role, company, contact info, and key requirements instantly." },
            { icon: BarChart3, title: "Match Scoring",     desc: "Your skills are automatically compared against job requirements to generate a real-time match percentage." },
            { icon: Mail,      title: "AI Cold Emails",    desc: "Generate professional, personalized cold emails, LinkedIn messages, and cover letters in seconds." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{ padding: 28, borderRadius: 14, background: "#fafafa", border: "1px solid #eee", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0f0f0", border: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon style={{ width: 18, height: 18, color: "#555" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#999" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how" style={{ padding: "80px 24px", background: "#fafafa", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#bbb", marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, letterSpacing: -0.5 }}>
              Three steps to winning outreach
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { num: "01", title: "Paste the job post",     desc: "Drop any job listing — LinkedIn, Upwork, email, anywhere." },
              { num: "02", title: "AI analyzes & scores",   desc: "PropAI extracts role, company, requirements and scores your match in seconds." },
              { num: "03", title: "Copy & send outreach",   desc: "Get a cold email, Upwork proposal, LinkedIn note, and cover letter — all personalized." },
            ].map(({ num, title, desc }) => (
              <div key={num} style={{ display: "flex", gap: 20, padding: "24px 28px", background: "#fff", border: "1px solid #eee", borderRadius: 14 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#e5e5e5", minWidth: 40, lineHeight: 1 }}>{num}</span>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "52px 36px", borderRadius: 18, background: "#fafafa", border: "1px solid #eee" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: "#111", marginBottom: 12 }}>
            Ready to land your next gig?
          </h2>
          <p style={{ fontSize: 15, color: "#aaa", marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
            Join thousands of professionals using PropAI to craft winning proposals.
          </p>
          <button
            onClick={() => router.push("/signup")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#333"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#111"; }}
          >
            Create Free Account <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid #eee", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles style={{ width: 11, height: 11, color: "#fff" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Prop<span style={{ color: "#888" }}>AI</span></span>
        </div>
        <p style={{ fontSize: 11, color: "#ccc", marginTop: 8 }}>© 2026 PropAI. Built for professionals.</p>
      </footer>
    </div>
  );
}
