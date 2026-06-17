"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, FileText, BarChart3, Mail,
  Users, Shield, ChevronRight, Zap, Sun, Moon,
} from "lucide-react";
import { useTheme } from "./components/theme-provider";

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrolled = scrollY > 50;

  return (
    <div
      style={{
        background: "var(--card)",
        color: "var(--foreground)",
        minHeight: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s ease",
          background: scrolled ? "var(--navbar-bg)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid var(--border)" : "none",
        }}
      >
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: "var(--foreground)",
                letterSpacing: -0.5,
              }}
            >
              The Pitchly
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
                style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", textDecoration: "none", padding: "6px 12px", transition: "color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                {label}
              </a>
            ))}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                marginLeft: 4,
                marginRight: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon style={{ width: 15, height: 15 }} />
              ) : (
                <Sun style={{ width: 15, height: 15 }} />
              )}
            </button>

            <button
              onClick={() => router.push("/login")}
              style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/signup")}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
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
            backgroundImage: "var(--hero-bg-image)",
            backgroundSize: "cover", backgroundPosition: "center bottom",
            opacity: theme === "dark" ? 0.35 : 0.12,
            transform: `translateY(${scrollY * 0.18}px)`,
            transition: "opacity 0.4s ease",
          }}
        />
        {/* Gradient fade */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme === "dark"
              ? "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.55) 70%, var(--card) 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 70%, var(--card) 100%)",
            transition: "background 0.3s ease",
          }}
        />

        <div style={{ position: "relative", zIndex: 10, padding: "0 24px", maxWidth: 700 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 50, background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, marginBottom: 30 }}>
            <Zap style={{ width: 13, height: 13, color: "var(--foreground)" }} />
            AI-Powered Proposal Engine
          </div>

          <h1 style={{ fontSize: "clamp(38px, 5.5vw, 60px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 20 }}>
            Craft winning proposals.{" "}
            <br />
            <span style={{ color: "var(--muted-foreground)" }}>Land more clients.</span>
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--muted-foreground)", maxWidth: 500, margin: "0 auto 36px" }}>
            Paste any job post. ThePitchly parses it, scores your match, and generates
            tailored cold emails and proposals — instantly.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/signup")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 30px", borderRadius: 11, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "var(--card-shadow)" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              Get Started — It&apos;s Free <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
            >
              See How It Works
            </button>
          </div>

          {/* Trust row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 52, color: "var(--muted-foreground)", opacity: 0.8, fontSize: 12, fontWeight: 500 }}>
            {[
              { icon: Shield, text: "Secure & Private" },
              { icon: Users,  text: "2,400+ Users" },
              { icon: Zap,    text: "AI Powered" },
            ].map(({ icon: Icon, text }, i) => (
              <React.Fragment key={text}>
                {i > 0 && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border)" }} />}
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
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "var(--muted-foreground)", marginBottom: 12 }}>What you get</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: -0.8, color: "var(--foreground)", marginBottom: 14 }}>
            Everything you need to <span style={{ color: "var(--muted-foreground)" }}>win outreach</span>
          </h2>
          <p style={{ fontSize: 15, color: "var(--muted-foreground)", maxWidth: 440, margin: "0 auto" }}>
            From parsing job posts to generating personalized proposals — ThePitchly handles the heavy lifting.
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
              style={{ padding: 28, borderRadius: 14, background: "var(--input)", border: "1px solid var(--border)", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--card-shadow)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon style={{ width: 18, height: 18, color: "var(--foreground)" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--muted-foreground)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how" style={{ padding: "80px 24px", background: "var(--input)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "var(--muted-foreground)", marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, letterSpacing: -0.5 }}>
              Three steps to winning outreach
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { num: "01", title: "Paste the job post",     desc: "Drop any job listing — LinkedIn, Upwork, email, anywhere." },
              { num: "02", title: "AI analyzes & scores",   desc: "ThePitchly extracts role, company, requirements and scores your match in seconds." },
              { num: "03", title: "Copy & send outreach",   desc: "Get a cold email, Upwork proposal, LinkedIn note, and cover letter — all personalized." },
            ].map(({ num, title, desc }) => (
              <div key={num} style={{ display: "flex", gap: 20, padding: "24px 28px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--border)", minWidth: 40, lineHeight: 1 }}>{num}</span>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "52px 36px", borderRadius: 18, background: "var(--input)", border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: "var(--foreground)", marginBottom: 12 }}>
            Ready to land your next gig?
          </h2>
          <p style={{ fontSize: 15, color: "var(--muted-foreground)", marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
            Join thousands of professionals using ThePitchly to craft winning proposals.
          </p>
          <button
            onClick={() => router.push("/signup")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", borderRadius: 10, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            Create Free Account <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>ThePitchly</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6, marginTop: 8 }}>© 2026 ThePitchly. Built for professionals.</p>
      </footer>
    </div>
  );
}
