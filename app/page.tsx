"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, FileText, BarChart3, Mail,
  Users, Shield, ChevronRight, Zap, Sun, Moon,
  MessageSquare, CheckCircle2, Loader2, Activity,
  Calendar, ArrowUpRight, Check, Send, Globe, Play,
} from "lucide-react";
import { useTheme } from "./components/theme-provider";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxRotate?: number;
  scale?: number;
}

const TiltCard: React.FC<TiltCardProps> = ({ 
  children, 
  className = "", 
  maxRotate = 4,
  scale = 1.012,
  ...props 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateY = ((x - xc) / xc) * maxRotate;
    const rotateX = -((y - yc) / yc) * maxRotate;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`);
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transform,
        transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)",
        transformStyle: "preserve-3d"
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

const SAMPLES = [
  {
    title: "React/Next.js Dev (Stripe)",
    jobText: "Looking for a Senior Next.js Developer to build interactive dashboard components, optimize PostgreSQL querying with Prisma, and hook up custom API integrations. Must have experience building smooth, high-fidelity UI animations.",
    score: 97,
    skillsMatched: ["React", "Next.js", "Prisma", "Postgres", "Tailwind CSS"],
    skillsMissing: ["Framer Motion"],
    email: `Subject: Helping Stripe scale developer dashboards with Next.js & Prisma

Hi Stripe Team,

I saw your opening for a Next.js Developer. Since I recently built Pitchly—an AI outreach platform with Next.js 16, Tailwind CSS v4, and Prisma—I'm intimately familiar with building high-performance, real-time dashboards and database-level optimization.

I'd love to help you build out these interactive components. Let's chat!`,
    proposal: `Hey there! I specialize in Next.js, Prisma, and Tailwind CSS. I saw your job post and would love to help.

I recently launched a proposal-generation platform built on Next.js 16 with a PostgreSQL/Prisma back-end. I have direct experience optimizing interactive transaction queries and database connections to handle heavy real-time data flows.

Let me know when you'd like to sync up!`
  },
  {
    title: "AI Specialist (Supabase)",
    jobText: "We are seeking a developer to build AI integrations with large language models, setup embedding databases with pgvector, and orchestrate background workflows. Experience with Next.js, Node, and Supabase is a must.",
    score: 94,
    skillsMatched: ["LLM Integration", "Next.js", "Node.js", "Supabase", "PostgreSQL"],
    skillsMissing: ["pgvector"],
    email: `Subject: Leveraging LLM integrations & Supabase at scale

Hi Supabase Team,

I'm reaching out regarding your AI Specialist role. At Pitchly, I designed and implemented our Gemini AI pipeline, built real-time expense and token cost logging, and integrated third-party APIs using OAuth (Gmail, Google Calendar).

I have a deep understanding of LLM latency management and background sync workflows. I'd love to help you expand your AI capabilities.`,
    proposal: `Hi! I saw your post looking for an AI & Supabase specialist.

I've integrated Gemini AI with Next.js to parse PDF files, analyze skills, and generate tailored client copy. I've also set up background processing daemons and synchronized database states with Supabase.

I can jump in immediately. Let's schedule a call!`
  }
];

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scrollY, setScrollY] = useState(0);

  // Simulator States
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simProgress, setSimProgress] = useState(0);
  const [simScore, setSimScore] = useState(0);
  const [simResultTab, setSimResultTab] = useState<"email" | "proposal">("email");
  const [typedText, setTypedText] = useState("");
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // WhatsApp Demo Message List
  const [waMessages, setWaMessages] = useState([
    { id: 1, sender: "Saurabh (Founder)", text: "Hey guys, need a senior React dev to build a landing page + oauth. Budget $2k. Hit me up at saurabh@techstart.io", time: "10:14 AM", status: "processing" },
    { id: 2, sender: "Aditya (Hiring)", text: "Looking for an outreach specialist to setup active email campaigns. Contact hr@leadflow.co", time: "10:20 AM", status: "unread" }
  ]);

  // Global Cursor Spotlight States
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseInWindow, setIsMouseInWindow] = useState(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleMouseEnter = () => setIsMouseInWindow(true);
    const handleMouseLeave = () => setIsMouseInWindow(false);

    window.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Simulator trigger
  const startSimulation = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setIsSimulating(true);
    setSimStep(1);
    setSimProgress(15);
    setSimScore(0);
    setTypedText("");

    // Step 1: Parsing
    setTimeout(() => {
      setSimStep(2);
      setSimProgress(50);
    }, 800);

    // Step 2: Scoring
    setTimeout(() => {
      setSimStep(3);
      setSimProgress(85);
      
      // Animate score counter
      let currentScore = 0;
      const targetScore = SAMPLES[activeSampleIndex].score;
      const scoreInterval = setInterval(() => {
        currentScore += 2;
        if (currentScore >= targetScore) {
          currentScore = targetScore;
          clearInterval(scoreInterval);
        }
        setSimScore(currentScore);
      }, 20);
    }, 1600);

    // Step 3: Generating Copy & typing animation
    setTimeout(() => {
      setSimStep(4);
      setSimProgress(100);
      
      // Start typing animation
      const fullText = simResultTab === "email" 
        ? SAMPLES[activeSampleIndex].email 
        : SAMPLES[activeSampleIndex].proposal;
      
      let index = 0;
      setTypedText("");
      
      typingTimerRef.current = setInterval(() => {
        setTypedText((prev) => prev + fullText.charAt(index));
        index++;
        if (index >= fullText.length) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          setIsSimulating(false);
        }
      }, 5);
    }, 2400);
  };

  // Change tab inside simulator
  useEffect(() => {
    if (simStep === 4) {
      // Re-trigger typing instantly for the tab switch if simulation finished or is in step 4
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      const fullText = simResultTab === "email" 
        ? SAMPLES[activeSampleIndex].email 
        : SAMPLES[activeSampleIndex].proposal;
      setTypedText(fullText);
    }
  }, [simResultTab, activeSampleIndex]);

  const scrolled = scrollY > 50;

  return (
    <div className="bg-background text-foreground min-h-screen relative overflow-x-hidden transition-colors duration-300">
      
      {/* Global Interactive Cursor Spotlight (Torch effect) */}
      {isMouseInWindow && (
        <>
          {/* Global Custom Cursor Ring (Torch light bulb style) */}
          <div
            className="pointer-events-none fixed w-8 h-8 rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_15px_rgba(0,176,255,0.4)] flex items-center justify-center z-50 transition-transform duration-75 ease-out hidden md:flex"
            style={{
              left: 0,
              top: 0,
              transform: `translate3d(${mousePos.x - 16}px, ${mousePos.y - 16}px, 0)`,
            }}
          >
            {/* Bright inner torch bulb with pulsing outer ring */}
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(0,176,255,1)] relative flex items-center justify-center">
              <div className="absolute inset-[-4px] rounded-full border border-blue-400/60 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>
        </>
      )}
      
      {/* ── BACKGROUND GLOWS ─────────────────────────────────────────────── */}
      <div className="absolute top-[-100px] left-[5%] w-[500px] h-[500px] bg-gradient-to-tr from-primary/20 via-blue-500/10 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[400px] right-[5%] w-[600px] h-[600px] bg-gradient-to-bl from-violet-500/10 via-primary/10 to-transparent blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[1400px] left-[-10%] w-[500px] h-[500px] bg-gradient-to-r from-emerald-500/5 to-transparent blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none z-0 opacity-40" />

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? "bg-navbar-bg/95 backdrop-blur-md border-b border-border shadow-sm py-4" 
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold shadow-md">
              P
            </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              Pitchly
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Pro
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Interactive Demo</a>
            <a href="#how" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#whatsapp" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">WA Automation</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center cursor-pointer hover:bg-input transition-colors text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign In
            </button>
            
            <button
              onClick={() => router.push("/signup")}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              Get Started <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 px-6 max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        
        {/* Left Column: Headline */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-input border border-border w-fit text-xs font-semibold text-foreground shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Outreach & Matching Engine v2.0
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-foreground">
            Solve Outreach Fatigue with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 dark:from-primary-fixed-dim dark:to-blue-400">
              Neural Precision.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Stop guessing. Start connecting. Pitchly's intelligent engine orchestrates your entire pipeline in a 30-second workflow: Sync resume, match skills, generate proposals, and deploy outreach.
          </p>

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={() => router.push("/signup")}
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-95 active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Free Trial <ArrowRight size={18} />
            </button>
            <a
              href="#demo"
              className="px-8 py-4 rounded-full border border-border bg-card/60 backdrop-blur-sm text-foreground font-bold hover:bg-input transition-all flex items-center justify-center gap-2"
            >
              <Play size={16} className="fill-current text-foreground" /> Try Sandbox
            </a>
          </div>

          {/* Bullet metrics */}
          <div className="flex items-center gap-8 pt-6 border-t border-border/60 mt-4">
            <div>
              <p className="text-2xl font-bold text-foreground">98%</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Match Accuracy</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-2xl font-bold text-foreground">10x</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Outreach Speed</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-2xl font-bold text-foreground">2,400+</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Active Freelancers</p>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Core Centerpiece / Mockup */}
        <div className="lg:col-span-5 relative w-full h-[480px] sm:h-[520px] flex items-center justify-center">
          {/* Ethereal background aura */}
          <div className="absolute w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 to-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

          {/* Glass dashboard frame */}
          <TiltCard className="relative w-full h-full rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-card overflow-hidden p-6 flex flex-col justify-between transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-xs text-muted-foreground ml-2 font-medium font-mono">match_engine.sh</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                Active
              </span>
            </div>

            {/* Simulated actions */}
            <div className="flex-1 flex flex-col gap-4 justify-center py-4">
              <div className="p-4 rounded-xl border border-border bg-input/40 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">resume_developer.pdf</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Parsed 24 core skills & 8 projects</p>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>

              <div className="p-4 rounded-xl border border-border bg-input/40 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Globe size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Scanned Job Post</p>
                  <p className="text-xs text-muted-foreground mt-0.5">React/Next.js Dev at Stripe</p>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>

              {/* Glowing active step */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Sparkles size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">Neural Matching fit...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Analyzing project overlaps</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                  97% match
                </span>
              </div>
            </div>

            {/* Bottom logs */}
            <div className="p-3 rounded-lg bg-black/90 text-emerald-400 font-mono text-[11px] leading-relaxed border border-border/20">
              <p>&gt; pitchly --resume resume_dev.pdf --analyze</p>
              <p className="text-muted-foreground">&gt; [OK] Skills overlap found: React, Next.js, Postgres</p>
              <p className="text-emerald-300 font-bold">&gt; [AI] Drafted highly custom email pitch in 1.2s</p>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ── INTERACTIVE PLAYGROUND DEMO ──────────────────────────────────── */}
      <section id="demo" className="py-24 px-6 bg-input/20 border-t border-b border-border/60 relative z-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">Interactive Sandbox</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 tracking-tight">Try the Outreach Engine</h2>
            <p className="text-muted-foreground mt-3">Select a sample job post below and watch the AI instantly parse requirements, score matching confidence, and write outreach pitches.</p>
          </div>

          {/* Sandbox Wrapper */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Sample picker and Input */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Select Sample Job Opening:</label>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLES.map((sample, index) => (
                    <button
                      key={sample.title}
                      onClick={() => {
                        setActiveSampleIndex(index);
                        setSimStep(0);
                        setTypedText("");
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        activeSampleIndex === index
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:bg-input"
                      }`}
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job post display */}
              <TiltCard className="flex-1 rounded-xl border border-border bg-card p-5 flex flex-col justify-between shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Job Description</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Source: Upwork</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic bg-input/40 p-4 rounded-lg border border-border/50">
                    "{SAMPLES[activeSampleIndex].jobText}"
                  </p>
                </div>

                <button
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className="w-full mt-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-95 disabled:opacity-75 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Simulating Match...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generate Outreach Pitch
                    </>
                  )}
                </button>
              </TiltCard>
            </div>

            {/* Right Column: AI Analysis Result Display */}
            <TiltCard className="lg:col-span-7 rounded-2xl border border-border bg-card overflow-hidden shadow-sm flex flex-col items-stretch min-h-[460px] transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
              
              {/* Simulation is idle or starting */}
              {simStep === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-bounce">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Click "Generate Outreach Pitch"</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">Watch the AI scan the resume profile, match technical skills, compute the candidate score, and write copy.</p>
                </div>
              )}

              {/* Simulation is active / running */}
              {simStep > 0 && (
                <div className="flex-1 flex flex-col">
                  {/* Status Bar */}
                  <div className="bg-input/60 border-b border-border/50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="text-primary animate-spin" />
                      <span className="text-xs font-bold text-foreground">
                        {simStep === 1 && "Parsing job requirements..."}
                        {simStep === 2 && "Matching profile skills..."}
                        {simStep === 3 && "Calculating match metrics..."}
                        {simStep >= 4 && "AI Generation Complete"}
                      </span>
                    </div>
                    {/* Progress slider */}
                    <div className="w-32 bg-border h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${simProgress}%` }} />
                    </div>
                  </div>

                  {/* Two-column layout in results */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 items-stretch divide-y md:divide-y-0 md:divide-x divide-border">
                    
                    {/* Score Panel */}
                    <div className="md:col-span-4 p-6 flex flex-col gap-6 items-center justify-center text-center bg-input/20">
                      {/* Circular Gauge */}
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" stroke="var(--border)" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            stroke="var(--primary)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={263.8}
                            strokeDashoffset={263.8 - (263.8 * simScore) / 100}
                            className="transition-all duration-300"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-foreground">{simScore}%</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Match</span>
                        </div>
                      </div>

                      {/* AI Fit feedback */}
                      {simStep >= 3 && (
                        <div className="space-y-4 w-full">
                          <div className="text-left bg-card p-3 rounded-lg border border-border/80 text-xs">
                            <p className="font-bold text-foreground mb-1">Matched Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {SAMPLES[activeSampleIndex].skillsMatched.map(s => (
                                <span key={s} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">{s}</span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-left bg-card p-3 rounded-lg border border-border/80 text-xs">
                            <p className="font-bold text-foreground mb-1">Missing / Gap</p>
                            <div className="flex flex-wrap gap-1">
                              {SAMPLES[activeSampleIndex].skillsMissing.map(s => (
                                <span key={s} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">{s}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Copied Text Panel */}
                    <div className="md:col-span-8 flex flex-col items-stretch justify-between">
                      {/* Tabs */}
                      <div className="border-b border-border flex items-center bg-input/30">
                        <button
                          onClick={() => setSimResultTab("email")}
                          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 cursor-pointer transition-all ${
                            simResultTab === "email"
                              ? "border-primary text-primary bg-card"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Cold Email Pitch
                        </button>
                        <button
                          onClick={() => setSimResultTab("proposal")}
                          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 cursor-pointer transition-all ${
                            simResultTab === "proposal"
                              ? "border-primary text-primary bg-card"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Upwork Proposal
                        </button>
                      </div>

                      {/* Display Screen */}
                      <div className="flex-1 p-5 relative overflow-y-auto max-h-[300px]">
                        {simStep < 4 ? (
                          <div className="flex flex-col gap-2 animate-pulse">
                            <div className="h-4 bg-border rounded w-3/4" />
                            <div className="h-4 bg-border rounded w-5/6" />
                            <div className="h-4 bg-border rounded w-2/3" />
                            <div className="h-4 bg-border rounded w-4/5" />
                          </div>
                        ) : (
                          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground select-all">
                            {typedText}
                          </pre>
                        )}
                      </div>

                      {/* Mock Send button */}
                      {simStep === 4 && (
                        <div className="border-t border-border p-3 flex justify-end bg-input/10">
                          <button
                            onClick={() => {
                              alert(`Sent outreach via Gmail connection!`);
                            }}
                            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Send size={12} /> Send Email Directly
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ── THE 30-SECOND WORKFLOW ───────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 max-w-[1200px] mx-auto z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Workflow Pipeline</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 tracking-tight">The 30-Second Workflow</h2>
          <p className="text-muted-foreground mt-3">Engineered to eliminate friction. From raw job postings to tailored client pitches in four automated steps.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Timeline Connector Line */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-[1px] bg-border z-0" />

          {[
            { step: "01", icon: FileText, title: "Sync Resume", desc: "Upload your PDF resume. Our neural core parses your skills and matches past projects.", color: "border-border" },
            { step: "02", icon: BarChart3, title: "Scan Job Post", desc: "Paste any job listing, or let our automated scrapers read them from incoming channels.", color: "border-border" },
            { step: "03", icon: Sparkles, title: "Generate Fit", desc: "The AI calculates your fit score, highlights matching assets, and flags missing experience.", color: "border-primary/40 shadow-[0_0_15px_rgba(0,176,255,0.1)]" },
            { step: "04", icon: Mail, title: "Deploy Outreach", desc: "Send tailored cold emails with attachments directly via connected Gmail or Zoho mailboxes.", color: "border-border" }
          ].map((item, idx) => (
            <TiltCard
              key={item.step}
              className={`glass-card p-6 rounded-2xl bg-card border relative z-10 flex flex-col items-center text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 ${item.color}`}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 text-primary border border-primary/20 shadow-inner">
                <item.icon size={22} />
              </div>
              <span className="text-xs font-black text-primary/30 font-mono tracking-widest">{item.step}</span>
              <h3 className="text-base font-extrabold text-foreground mt-2 mb-1.5">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ── BENTO GRID: FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-card border-t border-b border-border/60 relative z-10">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="mb-16 text-left max-w-2xl">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 tracking-tight">Engineered for Absolute Precision and Speed</h2>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px] sm:auto-rows-[300px]">
            
            {/* Box 1: Large (2 Columns wide) */}
            <TiltCard className="md:col-span-2 rounded-2xl border border-border bg-input/20 p-8 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
              <div className="max-w-md relative z-10">
                <h3 className="text-xl font-bold text-foreground mb-2">Contextual AI Writing Models</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our models don't just fill blanks or use static templates. Pitchly analyzes the recipient's background, past projects, and core tech stacks to write copy that feels authentic and human.
                </p>
              </div>
              
              {/* Floating graphic */}
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/25 transition-all duration-700 pointer-events-none" />
              <div className="absolute bottom-6 right-6 w-28 h-28 border border-border bg-card rounded-xl shadow-md flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform duration-500">
                <Sparkles size={40} className="text-primary" />
              </div>
            </TiltCard>

            {/* Box 2: Small */}
            <TiltCard className="rounded-2xl border border-border bg-input/20 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
              <div>
                <Activity size={24} className="text-primary mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-1">Deep Analytics</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Track open rates, calculate link clicks, and log exact AI token expenses in real-time.
                </p>
              </div>

              {/* Simulated Mini Chart */}
              <div className="mt-4 flex items-end gap-1.5 h-16 opacity-70">
                <div className="flex-1 bg-border rounded-t h-[40%] group-hover:h-[60%] transition-all duration-500" />
                <div className="flex-1 bg-border rounded-t h-[60%] group-hover:h-[80%] transition-all duration-500" />
                <div className="flex-1 bg-primary rounded-t h-[90%] group-hover:h-[100%] transition-all duration-500" />
                <div className="flex-1 bg-border rounded-t h-[50%] group-hover:h-[70%] transition-all duration-500" />
              </div>
            </TiltCard>

            {/* Box 3: Small */}
            <TiltCard className="rounded-2xl border border-border bg-input/20 p-8 flex flex-col justify-between shadow-sm group transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
              <div>
                <Calendar size={24} className="text-primary mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-1">OAuth Mail Sync</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Link multiple mailboxes like Gmail and Zoho. Seamlessly schedule follow-up calls with auto-generated Google Meet links.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-card text-foreground border border-border">Gmail</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-card text-foreground border border-border">Zoho</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-card text-foreground border border-border">Google Calendar</span>
              </div>
            </TiltCard>

            {/* Box 4: Large */}
            <TiltCard className="md:col-span-2 rounded-2xl border border-border bg-input/20 p-8 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">A/B Testing Autopilot</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Instantly deploy A/B variations of subject lines, greeting hooks, and templates. Pitchly monitors response rates and channels traffic to winning pitches.
                  </p>
                  <a href="#demo" className="text-xs font-bold text-primary flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    Try A/B Sandbox <ArrowRight size={14} />
                  </a>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-3 shadow-inner">
                  {/* Option A */}
                  <div className="flex items-center justify-between p-2 rounded bg-input/40 border border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[9px]">A</span>
                      <span className="font-semibold text-foreground">Direct Value Pitch</span>
                    </div>
                    <span className="font-extrabold text-emerald-500">74% open</span>
                  </div>

                  {/* Option B */}
                  <div className="flex items-center justify-between p-2 rounded bg-input/20 border border-border/20 text-xs opacity-50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-border text-foreground flex items-center justify-center font-bold text-[9px]">B</span>
                      <span className="font-semibold text-foreground">Casual Intro Hook</span>
                    </div>
                    <span className="font-extrabold text-foreground">39% open</span>
                  </div>
                </div>
              </div>
            </TiltCard>

          </div>
        </div>
      </section>

      {/* ── WHATSAPP AUTOMATION SHOWCASE ─────────────────────────────────── */}
      <section id="whatsapp" className="py-24 px-6 max-w-[1200px] mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Context */}
          <div className="lg:col-span-5 flex flex-col gap-6 text-left">
            <span className="text-xs font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">Community Lead Capture</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Sync Jobs Directly From WhatsApp Groups</h2>
            <p className="text-muted-foreground leading-relaxed">
              Don't spend all day scrolling developer community channels. Pitchly connects to your WhatsApp groups, scans messages in the background, extracts recruiter details, and surfaces direct hiring leads instantly.
            </p>
            <div className="space-y-3 pt-2">
              {[
                "Automatic duplicate detection (removes spam & duplicate forwards)",
                "Full Gemini AI analysis of raw chat messages",
                "Instant Match Score calculation against your profile"
              ].map(bullet => (
                <div key={bullet} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 size={16} className="text-primary mt-0.5" />
                  <span className="text-foreground">{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Visual Simulated Feed */}
          <TiltCard className="lg:col-span-7 rounded-2xl border border-border bg-input/10 p-6 shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/20">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md flex flex-col">
              
              {/* Header */}
              <div className="bg-[#075e54] text-white p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  WA
                </div>
                <div>
                  <h3 className="text-sm font-bold">Tech Founders & Freelancers</h3>
                  <p className="text-[10px] opacity-85">Active sync running...</p>
                </div>
              </div>

              {/* Chat messages list */}
              <div className="p-4 space-y-4 bg-input/20 min-h-[220px]">
                {waMessages.map(msg => (
                  <div key={msg.id} className="flex flex-col gap-1 items-start max-w-[85%] bg-card p-3 rounded-lg border border-border shadow-sm">
                    <span className="text-[10px] font-bold text-primary">{msg.sender}</span>
                    <p className="text-xs text-foreground leading-relaxed italic">"{msg.text}"</p>
                    <div className="w-full flex justify-between items-center mt-2 pt-1 border-t border-border/30 text-[9px] text-muted-foreground">
                      <span>{msg.time}</span>
                      {msg.status === "processing" ? (
                        <span className="text-primary font-bold animate-pulse">● Scanning Lead...</span>
                      ) : (
                        <span className="text-emerald-500 font-bold">✓ Approved Lead</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Extracted Card result */}
              <div className="border-t border-border p-4 bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Extracted Developer Lead</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Saurabh (Founder) • saurabh@techstart.io • 95% Match fit</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      alert("Opening workspace for this Lead...");
                    }}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded bg-primary text-primary-foreground font-bold text-[10px] hover:opacity-90 cursor-pointer"
                  >
                    Generate Pitch
                  </button>
                </div>
              </div>

            </div>
          </TiltCard>

        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto z-10 relative">
        <TiltCard scale={1.006} className="rounded-3xl border border-border/80 bg-gradient-to-tr from-primary/10 via-card to-blue-500/5 p-8 md:p-16 text-center shadow-lg relative overflow-hidden group select-none transition-all duration-300 ease-out hover:border-primary/20 hover:shadow-xl">

          {/* Glow circle overlay */}
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground max-w-2xl mx-auto relative z-10">
            Ready to win outreach on autopilot?
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-lg mx-auto relative z-10">
            Join thousands of consultants and developers who are landing jobs and clients using Pitchly's matching tools.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <button
              onClick={() => router.push("/signup")}
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              Get Started for Free <ArrowRight size={18} />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById("demo");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 rounded-full border border-border bg-card hover:bg-input text-foreground font-bold transition-all cursor-pointer"
            >
              Play in Sandbox
            </button>
          </div>
        </TiltCard>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="w-full py-12 px-6 border-t border-border/60 bg-card z-10 relative text-xs">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2 items-center sm:items-start text-center sm:text-left">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-[10px]">
                P
              </div>
              Pitchly
            </div>
            <p className="text-muted-foreground">© 2026 Pitchly AI Technologies. AI-powered precision outreach for elite professionals.</p>
          </div>

          <div className="flex flex-wrap gap-4 text-muted-foreground justify-center sm:justify-end">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Security</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
