"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "./sidebar";
import { 
  Briefcase, 
  Sparkles, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Search, 
  ChevronRight,
  TrendingUp, 
  Users, 
  Check, 
  Copy,
  Trash2, 
  BookOpen, 
  Edit3,
  Loader2,
  AlertCircle,
  UploadCloud,
  FileText,
  ExternalLink,
  Award,
  Terminal,
  GraduationCap,
  Save,
  X
} from "lucide-react";
import { 
  getJobPostsAction, 
  addJobPostAction, 
  updateJobPostAction, 
  deleteJobPostAction, 
  getUserProfileAction,
  saveUserProfileAction
} from "../actions/db-actions";
import { JobPost, UserProfile } from "../utils/db";
import { analyzeJobPost } from "../utils/ai-engine";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter
} from "./ui/drawer";
import { clsx } from "clsx";

interface DashboardViewProps {
  onLogout: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  userEmail: string;
}

export default function DashboardView({ onLogout, theme, toggleTheme, userEmail }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "new" | "profile">("dashboard");
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // User Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Job pasting state
  const [pasteText, setPasteText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  
  // Drawer states
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<"details" | "templates">("templates");
  const [templateActiveTab, setTemplateActiveTab] = useState<"coldEmail" | "proposal" | "linkedin" | "coverLetter">("coldEmail");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [notesText, setNotesText] = useState("");

  // Resume Upload Simulation States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeUploadStep, setResumeUploadStep] = useState("");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Profile Skills Add input
  const [newSkillText, setNewSkillText] = useState("");

  // Load jobs and profile from local DB
  const loadWorkspaceData = async () => {
    try {
      const dbJobs = await getJobPostsAction();
      const dbProfile = await getUserProfileAction(userEmail);
      setJobs(dbJobs);
      setProfile(dbProfile);
    } catch (error) {
      console.error("Failed to load workspace data:", error);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [userEmail]);

  // Live Heuristics Parsing for Paste View
  const liveHeuristics = useMemo(() => {
    if (!pasteText.trim()) return null;
    
    // Quick Extract email
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const foundEmails = pasteText.match(emailRegex);
    const email = foundEmails ? foundEmails[0] : "Looking...";

    // Quick Role
    let role = "Analyzing...";
    if (/react/i.test(pasteText)) role = "React.js Engineer";
    else if (/flutter/i.test(pasteText)) role = "Flutter Support Engineer";
    else if (/product/i.test(pasteText)) role = "Product Architect";

    // Quick Company
    let company = "Analyzing...";
    if (/Zvart/i.test(pasteText)) company = "Zvart Manukyan Dev";
    else if (/Vercel/i.test(pasteText)) company = "Vercel Corp";
    else if (/Linear/i.test(pasteText)) company = "Linear App";

    // Score estimation
    let score = 70;
    
    if (profile) {
      // Dynamic score computation based on matched skills from current profile
      const matched = profile.skills.filter(skill => {
        const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        return regex.test(pasteText);
      });
      score = 65 + Math.min(matched.length * 4, 30);
    } else {
      if (/react/i.test(pasteText)) score += 15;
      if (/flutter/i.test(pasteText)) score += 10;
    }

    return { role, company, email, score: Math.min(score, 100) };
  }, [pasteText, profile]);

  // Statistics Computations
  const stats = useMemo(() => {
    const total = jobs.length;
    const avgMatch = total > 0 ? Math.round(jobs.reduce((acc, j) => acc + j.matchScore, 0) / total) : 0;
    const active = jobs.filter(j => j.status === "Sent" || j.status === "Interviewing").length;
    const generated = jobs.filter(j => j.status === "Generated" || j.status === "Sent").length;
    return { total, avgMatch, active, generated };
  }, [jobs]);

  // Filter & Search Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.contactEmail && job.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = 
        statusFilter === "all" || 
        job.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [jobs, searchQuery, statusFilter]);

  // Handle New Job Submission (AI analysis)
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    setIsGenerating(true);
    setGenerationStep(0);

    const steps = [
      "Deconstructing job specifications...",
      "Extracting recruiters and contact vectors...",
      "Calculating candidacy match vector...",
      "Engineering professional cold email draft...",
      "Drafting contextual Upwork bid proposal...",
      "Synthesizing high-impact templates..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setGenerationStep(currentStep);
      } else {
        clearInterval(interval);
        
        // Finalize analysis
        const analysis = analyzeJobPost(pasteText, profile!);
        addJobPostAction({
          role: analysis.role,
          company: analysis.company,
          originalText: pasteText,
          parsedSummary: analysis.parsedSummary,
          contactName: analysis.contactName,
          contactEmail: analysis.contactEmail,
          matchScore: analysis.matchScore,
          tags: analysis.tags,
          notes: analysis.notes,
          generatedTemplates: analysis.generatedTemplates
        }).then((newJob) => {
          // Reset & Refresh states
          setPasteText("");
          setIsGenerating(false);
          loadWorkspaceData().then(() => {
            // Return to dashboard and auto-open the new job drawer
            setActiveTab("dashboard");
            setSelectedJob(newJob);
            setNotesText(newJob.notes || "");
            setDrawerActiveTab("templates");
            setTemplateActiveTab("coldEmail");
            setIsDrawerOpen(true);
          });
        }).catch((err) => {
          console.error("Failed to add job post:", err);
          setIsGenerating(false);
        });
      }
    }, 600);
  };

  // Drawer click actions
  const openJobDrawer = (job: JobPost) => {
    setSelectedJob(job);
    setNotesText(job.notes || "");
    setDrawerActiveTab("templates");
    setTemplateActiveTab("coldEmail");
    setIsDrawerOpen(true);
  };

  // Copy Template Actions
  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };

  // Save notes updates
  const handleSaveNotes = async () => {
    if (!selectedJob) return;
    const updated = { ...selectedJob, notes: notesText };
    await updateJobPostAction(updated);
    setSelectedJob(updated);
    await loadWorkspaceData();
  };

  // Update job status from drawer
  const handleStatusChange = async (status: JobPost["status"]) => {
    if (!selectedJob) return;
    const updated = { ...selectedJob, status };
    await updateJobPostAction(updated);
    setSelectedJob(updated);
    await loadWorkspaceData();
  };

  // Delete Job Action
  const handleDeleteJob = async (id: string) => {
    if (confirm("Are you sure you want to delete this job scan?")) {
      await deleteJobPostAction(id);
      setIsDrawerOpen(false);
      setSelectedJob(null);
      await loadWorkspaceData();
    }
  };

  // --- PROFILE VIEW EDIT ACTIONS ---
  
  // Save User Profile to DB
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    setProfileSaving(true);
    setProfileSaveSuccess(false);

    try {
      await saveUserProfileAction(profile);
      setProfileSaving(false);
      setProfileSaveSuccess(true);
      await loadWorkspaceData();
      
      // Auto dismiss success toast after 3s
      setTimeout(() => {
        setProfileSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setProfileSaving(false);
    }
  };

  // Simulated Resume Upload
  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleResumeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploadingResume(true);
    setResumeUploadStep("Opening file buffers...");

    const uploadSteps = [
      "Decompressing resume layout blocks...",
      "Analyzing visual font structures...",
      "Running semantic OCR filters...",
      "Extracting tech stack indices...",
      "Injecting new candidates parameters..."
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < uploadSteps.length) {
        setResumeUploadStep(uploadSteps[stepIdx]);
        stepIdx++;
      } else {
        clearInterval(interval);
        
        // Parse and enrich profile with parsed skills (Simulated)
        const currentSkills = [...profile.skills];
        const newSkills = ["Docker", "Kubernetes", "GraphQL", "AWS"].filter(
          s => !currentSkills.includes(s)
        );

        const updatedProfile: UserProfile = {
          ...profile,
          resumeFileName: file.name,
          skills: [...currentSkills, ...newSkills]
        };

        setProfile(updatedProfile);
        saveUserProfileAction(updatedProfile).then(() => {
          setIsUploadingResume(false);
          loadWorkspaceData();
        }).catch((err) => {
          console.error("Failed to save resume profile:", err);
          setIsUploadingResume(false);
        });

        // Trigger success notification
        setProfileSaveSuccess(true);
        setTimeout(() => {
          setProfileSaveSuccess(false);
        }, 4000);
      }
    }, 500);
  };

  // Add a technical skill badge
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillText.trim() || !profile) return;

    if (!profile.skills.includes(newSkillText.trim())) {
      const updated = {
        ...profile,
        skills: [...profile.skills, newSkillText.trim()]
      };
      setProfile(updated);
    }
    setNewSkillText("");
  };

  // Delete a technical skill badge
  const handleDeleteSkill = (skillToDelete: string) => {
    if (!profile) return;
    const updated = {
      ...profile,
      skills: profile.skills.filter(s => s !== skillToDelete)
    };
    setProfile(updated);
  };

  // Modify individual project details
  const handleProjectDetailChange = (idx: number, field: "name" | "description" | "tech", value: string) => {
    if (!profile) return;
    const updatedProjects = [...profile.projects];
    if (field === "tech") {
      updatedProjects[idx] = {
        ...updatedProjects[idx],
        tech: value.split(",").map(t => t.trim()).filter(Boolean)
      };
    } else {
      updatedProjects[idx] = {
        ...updatedProjects[idx],
        [field]: value
      };
    }
    setProfile({
      ...profile,
      projects: updatedProjects
    });
  };

  // Delete a project card
  const handleDeleteProject = (idx: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.filter((_, i) => i !== idx)
    });
  };

  // Add a blank project card
  const handleAddBlankProject = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: [
        ...profile.projects,
        { name: "New Project Showcase", tech: ["React"], description: "Briefly explain the architectural hurdles and tech modules utilized." }
      ]
    });
  };

  // Modify individual education details
  const handleEducationChange = (idx: number, field: "degree" | "school" | "year", value: string) => {
    if (!profile) return;
    const updatedEdu = [...profile.education];
    updatedEdu[idx] = {
      ...updatedEdu[idx],
      [field]: value
    };
    setProfile({
      ...profile,
      education: updatedEdu
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden p-4 space-x-6">
      
      {/* Dynamic Floating Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
        userName={profile?.name}
        userRole={profile?.role}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col space-y-6 max-h-screen overflow-y-auto pr-2">
        
        {/* Workspace Greeting Header */}
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {activeTab === "dashboard" && (
                <>
                  Outreach Workspace <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/10">Active Sandbox</span>
                </>
              )}
              {activeTab === "new" && (
                <>
                  Deep Scan Job Analyzer <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/10">AI Mode</span>
                </>
              )}
              {activeTab === "profile" && (
                <>
                  Candidate Profile Core <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/10">Dynamic Synthesis</span>
                </>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === "dashboard" && "Organize outreach, manage parsed channels, and customize templates."}
              {activeTab === "new" && "Paste raw job postings to run smart heuristic parser extraction."}
              {activeTab === "profile" && "Configure the custom parameters and resume points the AI uses to customize outreach cover letters."}
            </p>
          </div>
          
          {activeTab === "dashboard" && (
            <button
              onClick={() => setActiveTab("new")}
              className="flex items-center space-x-2 px-4.5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-foreground rounded-xl text-sm font-semibold shadow-[0_4px_15px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Job Scan</span>
            </button>
          )}

          {activeTab === "profile" && (
            <button
              onClick={() => handleSaveProfile()}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-foreground rounded-xl text-sm font-semibold shadow-[0_4px_15px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Profile Settings</span>
            </button>
          )}
        </header>

        {/* PROFILE SAVE SUCCESS BANNER */}
        {profileSaveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>AI embedding parameters aligned! All subsequent proposals will read your updated resume settings immediately.</span>
          </div>
        )}

        {/* --- VIEW 1: DASHBOARD WORKSPACE --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* 1. Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass p-5 rounded-2xl flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Scans</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total}</h3>
                </div>
              </div>

              <div className="glass p-5 rounded-2xl flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Match</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">{stats.avgMatch}%</h3>
                </div>
              </div>

              <div className="glass p-5 rounded-2xl flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Apps</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">{stats.active}</h3>
                </div>
              </div>

              <div className="glass p-5 rounded-2xl flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outreach Prepared</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">{stats.generated}</h3>
                </div>
              </div>
            </div>

            {/* 2. Filters & Searches */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/40 p-4 rounded-xl border border-border">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search role, company, skills..."
                  className="w-full pl-10 pr-4 py-2 bg-background/60 rounded-xl border border-border text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
              </div>

              {/* Status Segmented Controls */}
              <div className="flex space-x-1.5 p-1 rounded-xl bg-background/50 border border-border w-full sm:w-auto overflow-x-auto">
                {["All", "Draft", "Generated", "Sent", "Interviewing"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status.toLowerCase())}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap",
                      statusFilter === status.toLowerCase()
                        ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                        : "text-muted-foreground hover:text-slate-200"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Job posts table/list */}
            <div className="space-y-3">
              {filteredJobs.length === 0 ? (
                <div className="glass p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center">
                  <Briefcase className="h-10 w-10 text-slate-600 mb-3" />
                  <p className="text-muted-foreground text-sm font-medium">No job postings match your filters.</p>
                  <p className="text-xs text-slate-500 mt-1">Try expanding your search query or paste a new post.</p>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const isHighMatch = job.matchScore >= 90;
                  const isMedMatch = job.matchScore >= 80 && job.matchScore < 90;
                  
                  return (
                    <div
                      key={job.id}
                      onClick={() => openJobDrawer(job)}
                      className="group glass p-4.5 rounded-xl hover:border-border transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Role, Company details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start md:items-center gap-2.5 flex-wrap">
                          <h4 className="text-base font-semibold text-foreground group-hover:text-indigo-400 transition-colors">
                            {job.role}
                          </h4>
                          <span className="text-xs font-semibold text-muted-foreground">at</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-slate-300 font-medium">
                            {job.company}
                          </span>
                          
                          {/* Match Score Indicator */}
                          <div className={clsx(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold border",
                            isHighMatch 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                              : isMedMatch
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/15"
                          )}>
                            {job.matchScore}% Match
                          </div>
                        </div>

                        {/* Middle metadata */}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground flex-wrap gap-y-1.5">
                          {job.contactEmail && (
                            <div className="flex items-center space-x-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-500" />
                              <span>{job.contactEmail}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span>
                              {new Date(job.postedDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Tag badges */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {job.tags.slice(0, 4).map((tag, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-card text-muted-foreground border border-border"
                            >
                              {tag}
                            </span>
                          ))}
                          {job.tags.length > 4 && (
                            <span className="text-[9px] text-slate-500">+{job.tags.length - 4} more</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Status and actions */}
                      <div className="flex items-center justify-between md:justify-end space-x-4">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-xs font-semibold border",
                          job.status === "Draft" && "bg-card text-muted-foreground border-border",
                          job.status === "Generated" && "bg-cyan-500/10 text-cyan-400 border-cyan-500/15",
                          job.status === "Sent" && "bg-indigo-500/10 text-indigo-400 border-indigo-500/15",
                          job.status === "Interviewing" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
                          job.status === "Declined" && "bg-rose-500/10 text-rose-400 border-rose-500/15"
                        )}>
                          {job.status}
                        </span>

                        <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                          <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* --- VIEW 2: PASTE & SCAN PORTAL --- */}
        {activeTab === "new" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Input Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden">
                {isGenerating && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-20 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                    <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-foreground">Synthesizing Proposal Models...</p>
                      <p className="text-xs text-indigo-400 font-mono animate-pulse">
                        {
                          [
                            "Deconstructing job specifications...",
                            "Extracting recruiters and contact vectors...",
                            "Calculating candidacy match vector...",
                            "Engineering professional cold email draft...",
                            "Drafting contextual Upwork bid proposal...",
                            "Synthesizing high-impact templates..."
                          ][generationStep]
                        }
                      </p>
                    </div>
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                        style={{ width: `${((generationStep + 1) / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-200">
                      Raw Job Post Content
                    </label>
                    <button
                      type="button"
                      onClick={() => setPasteText(`View Zvart Manukyan’s profile
Zvart Manukyan

 • 3rd+

Technical Project & Product Manager | AI-Driven Product Development | Ex-Software Engineer

1h • 


Follow
Hey there :)

Looking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.
Someone who feels confident with frontend, cares about reusable code, and can also support a Flutter app when needed.
Ping me if this sounds like you, or share it with someone who might be a good fit.`)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Insert Zvart's LinkedIn Post (Demo)
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste the full job post, LinkedIn listing, Upwork description, or email request here..."
                    className="w-full p-4 bg-background/50 rounded-xl border border-border text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200 resize-none font-sans leading-relaxed"
                  />

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setPasteText("")}
                      className="px-4 py-2.5 bg-card border border-border hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                    >
                      Clear Text
                    </button>
                    <button
                      type="submit"
                      disabled={!pasteText.trim()}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-foreground rounded-xl text-sm font-semibold shadow-[0_4px_15px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                    >
                      <Sparkles className="h-4.5 w-4.5" />
                      <span>Parse & Generate Outreach</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Heuristics Insights Column */}
            <div className="space-y-6">
              <div className="glass p-6 rounded-2xl border border-border h-[430px] flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    Real-time Parsing Core
                  </h3>

                  {!liveHeuristics ? (
                    <div className="flex flex-col items-center justify-center h-56 text-center text-slate-500 space-y-2">
                      <AlertCircle className="h-8 w-8 text-slate-600" />
                      <p className="text-xs font-semibold">Waiting for inputs</p>
                      <p className="text-[10px] max-w-[180px] leading-relaxed">
                        Start pasting or type in the text box. The AI heuristics will parse live insights here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4 animate-in fade-in">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Identified Role</span>
                        <p className="text-sm font-bold text-foreground">{liveHeuristics.role}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Target Company</span>
                        <p className="text-sm font-semibold text-slate-200">{liveHeuristics.company}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Contact E-Mail</span>
                        <p className="text-xs font-mono text-indigo-300">{liveHeuristics.email}</p>
                      </div>

                      {/* Matching Progress */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Candidacy Score</span>
                          <span className="text-xs font-bold text-emerald-400">{liveHeuristics.score}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${liveHeuristics.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[10px] text-indigo-300 leading-relaxed">
                  <strong>AI Engine Directive</strong>: Models are seeded with candidate profile <strong>{profile?.name}</strong>, matching expertise in reusable frontend stacks.
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- VIEW 3: CANDIDATE PROFILE EDITOR VIEW --- */}
        {activeTab === "profile" && profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-12">
            
            {/* Left Column: Resume & Social Credentials */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Resume Drag & Drop Mock Card */}
              <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden">
                {isUploadingResume && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-15 flex flex-col items-center justify-center space-y-3 text-center p-4 animate-in fade-in">
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-xs font-semibold text-foreground">Parsing Resume Index...</p>
                    <p className="text-[9px] font-mono text-indigo-400 animate-pulse">{resumeUploadStep}</p>
                  </div>
                )}

                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <FileText className="h-4.5 w-4.5 text-indigo-400" />
                  Primary Candidate Resume
                </h3>

                <div className="space-y-4 pt-4">
                  {/* File Upload Zone */}
                  <div 
                    onClick={handleTriggerFileInput}
                    className="border border-dashed border-border hover:border-indigo-500/40 hover:bg-indigo-500/2 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleResumeFileSelected} 
                      accept=".pdf,.docx,.doc" 
                      className="hidden" 
                    />
                    <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <p className="text-xs font-bold text-slate-300">Upload New Resume</p>
                    <p className="text-[9px] text-slate-500">Supports PDF, DOCX up to 10MB</p>
                  </div>

                  {/* Active Resume Status */}
                  <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200 truncate pr-1">
                        {profile.resumeFileName || "No active resume file"}
                      </span>
                    </div>
                    {profile.resumeFileName && (
                      <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Socials Credentials Card */}
              <div className="glass p-6 rounded-2xl border border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <Users className="h-4.5 w-4.5 text-indigo-400" />
                  General Credentials
                </h3>

                <form className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Candidate Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Expertise Role</label>
                    <input
                      type="text"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
                      <span>Portfolio URL</span>
                      <ExternalLink className="h-3 w-3 text-slate-500" />
                    </label>
                    <input
                      type="url"
                      value={profile.portfolioUrl}
                      onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">GitHub URL</label>
                    <input
                      type="url"
                      value={profile.githubUrl}
                      onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">LinkedIn Profile</label>
                    <input
                      type="url"
                      value={profile.linkedinUrl}
                      onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/70"
                    />
                  </div>
                </form>
              </div>

            </div>

            {/* Right Column: Skills, Education, & Projects */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Technical Skills Log */}
              <div className="glass p-6 rounded-2xl border border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <Award className="h-4.5 w-4.5 text-indigo-400" />
                  Technical Skills Index
                </h3>

                <div className="pt-4 space-y-4">
                  {/* Skill Badge Container */}
                  <div className="flex flex-wrap gap-1.5 p-3.5 bg-background/40 border border-border rounded-xl min-h-[80px]">
                    {profile.skills.map((skill) => (
                      <span 
                        key={skill}
                        className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 font-medium group transition-all"
                      >
                        <span>{skill}</span>
                        <button 
                          type="button"
                          onClick={() => handleDeleteSkill(skill)}
                          className="text-indigo-400/60 hover:text-rose-400 hover:scale-110 transition-all cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add skill form */}
                  <form onSubmit={handleAddSkill} className="flex gap-2">
                    <input
                      type="text"
                      value={newSkillText}
                      onChange={(e) => setNewSkillText(e.target.value)}
                      placeholder="Add technical capability (e.g. Docker, Webpack)..."
                      className="flex-1 px-3 py-2 bg-background/50 rounded-lg border border-border text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-indigo-500/70"
                    />
                    <button
                      type="submit"
                      disabled={!newSkillText.trim()}
                      className="px-4 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/15 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      Add Skill
                    </button>
                  </form>
                </div>
              </div>

              {/* Featured Projects Log */}
              <div className="glass p-6 rounded-2xl border border-border">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Terminal className="h-4.5 w-4.5 text-indigo-400" />
                    Featured Project Accomplishments
                  </h3>
                  <button
                    onClick={handleAddBlankProject}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Project</span>
                  </button>
                </div>

                <div className="space-y-4 pt-4">
                  {profile.projects.map((proj, idx) => (
                    <div key={idx} className="p-4 bg-card border border-border rounded-xl space-y-3 relative group">
                      
                      {/* Project delete anchor */}
                      <button
                        onClick={() => handleDeleteProject(idx)}
                        className="absolute right-3 top-3 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-500">Project Name</label>
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => handleProjectDetailChange(idx, "name", e.target.value)}
                            className="w-full px-3 py-1.5 bg-background/40 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-500">Tech Stack (comma separated)</label>
                          <input
                            type="text"
                            value={proj.tech.join(", ")}
                            onChange={(e) => handleProjectDetailChange(idx, "tech", e.target.value)}
                            className="w-full px-3 py-1.5 bg-background/40 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Project Description</label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => handleProjectDetailChange(idx, "description", e.target.value)}
                          className="w-full px-3 py-1.5 bg-background/40 rounded-lg border border-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education History */}
              <div className="glass p-6 rounded-2xl border border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <GraduationCap className="h-4.5 w-4.5 text-indigo-400" />
                  Education History
                </h3>

                <div className="space-y-4 pt-4">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Degree & Specialization</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => handleEducationChange(idx, "degree", e.target.value)}
                          className="w-full px-3 py-1.5 bg-background/40 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Institution Name</label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => handleEducationChange(idx, "school", e.target.value)}
                          className="w-full px-3 py-1.5 bg-background/40 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Academic Year / Timeline</label>
                        <input
                          type="text"
                          value={edu.year}
                          onChange={(e) => handleEducationChange(idx, "year", e.target.value)}
                          className="w-full px-3 py-1.5 bg-background/40 rounded-lg border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* --- RADIX DRAWER: JOB DETAILS & AI OUTREACH VIEW --- */}
      {selectedJob && (
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="max-w-3xl">
            <DrawerHeader>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 font-semibold">
                  {selectedJob.matchScore}% Candidate Fit
                </span>
                <span className={clsx(
                  "px-2 py-0.5 rounded text-xs font-semibold border",
                  selectedJob.status === "Draft" && "bg-card text-muted-foreground border-border",
                  selectedJob.status === "Generated" && "bg-cyan-500/10 text-cyan-400 border-cyan-500/15",
                  selectedJob.status === "Sent" && "bg-indigo-500/10 text-indigo-400 border-indigo-500/15",
                  selectedJob.status === "Interviewing" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
                  selectedJob.status === "Declined" && "bg-rose-500/10 text-rose-400 border-rose-500/15"
                )}>
                  {selectedJob.status}
                </span>
              </div>
              <DrawerTitle className="text-2xl font-bold text-foreground mt-3">
                {selectedJob.role}
              </DrawerTitle>
              <DrawerDescription>
                Company: <span className="font-semibold text-slate-200">{selectedJob.company}</span>
                {selectedJob.contactName && ` • Recruiter: ${selectedJob.contactName}`}
                {selectedJob.contactEmail && ` • Email: ${selectedJob.contactEmail}`}
              </DrawerDescription>

              {/* Drawer Top Tabs */}
              <div className="flex space-x-2 mt-6 p-1 rounded-xl bg-card border border-border w-64">
                <button
                  onClick={() => setDrawerActiveTab("templates")}
                  className={clsx(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                    drawerActiveTab === "templates"
                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/10"
                      : "text-muted-foreground hover:text-slate-200"
                  )}
                >
                  AI Templates
                </button>
                <button
                  onClick={() => setDrawerActiveTab("details")}
                  className={clsx(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                    drawerActiveTab === "details"
                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/10"
                      : "text-muted-foreground hover:text-slate-200"
                  )}
                >
                  Job Details
                </button>
              </div>
            </DrawerHeader>

            {/* DRAWER CONTAINER CONTENT */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              
              {/* TAB CONTENT: AI TEMPLATES */}
              {drawerActiveTab === "templates" && (
                <div className="space-y-4 h-full flex flex-col">
                  {/* Template Sub tabs */}
                  <div className="flex space-x-1 border-b border-border pb-2">
                    {[
                      { key: "coldEmail", label: "✉️ Cold Email" },
                      { key: "proposal", label: "💼 Freelance / Upwork" },
                      { key: "linkedin", label: "🔗 LinkedIn Connect" },
                      { key: "coverLetter", label: "📄 Cover Letter" }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setTemplateActiveTab(tab.key as any)}
                        className={clsx(
                          "px-3 py-2 text-xs font-semibold transition-all border-b-2 cursor-pointer pb-2.5",
                          templateActiveTab === tab.key
                            ? "border-indigo-500 text-indigo-300"
                            : "border-transparent text-muted-foreground hover:text-slate-200"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Template Text Area */}
                  {selectedJob.generatedTemplates && selectedJob.generatedTemplates[templateActiveTab] ? (
                    <div className="relative flex-1 min-h-[320px] bg-card/60 border border-border rounded-xl p-5 flex flex-col justify-between">
                      <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto pr-1">
                        {selectedJob.generatedTemplates[templateActiveTab]}
                      </pre>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">
                          Ready for outreach
                        </span>
                        
                        <button
                          onClick={() => handleCopyToClipboard(
                            selectedJob.generatedTemplates?.[templateActiveTab] || "", 
                            templateActiveTab
                          )}
                          className={clsx(
                            "flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border",
                            copiedStates[templateActiveTab]
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-indigo-500/10 text-indigo-300 border-indigo-500/15 hover:bg-indigo-500/15"
                          )}
                        >
                          {copiedStates[templateActiveTab] ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Copied To Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy Template Text</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card/30 border border-border rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px]">
                      <Sparkles className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-semibold text-muted-foreground">Template Not Found</p>
                      <p className="text-xs text-slate-500">
                        This template is missing or was deleted. Tap regenerate to rebuild outreach scripts.
                      </p>
                      <button
                        onClick={() => {
                          const analysis = analyzeJobPost(selectedJob.originalText, profile!);
                          const updated = {
                            ...selectedJob,
                            generatedTemplates: analysis.generatedTemplates
                          };
                          setSelectedJob(updated);
                          updateJobPostAction(updated).then(() => {
                            loadWorkspaceData();
                          }).catch((err) => {
                            console.error("Failed to regenerate templates:", err);
                          });
                        }}
                        className="px-4 py-2 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-xs font-semibold hover:bg-indigo-500/20 cursor-pointer"
                      >
                        Regenerate All AI Models
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: JOB DETAILS */}
              {drawerActiveTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Original Text */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original Posting Text</span>
                      <div className="bg-card border border-border p-4 rounded-xl max-h-[300px] overflow-y-auto">
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                          {selectedJob.originalText}
                        </pre>
                      </div>
                    </div>

                    {/* Notes Custom Section */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5" /> Workspace Notes
                      </span>
                      <textarea
                        rows={4}
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Write dynamic tags, custom salary ranges, or application follow-up strategies..."
                        className="w-full p-3 bg-card rounded-xl border border-border text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveNotes}
                          className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 hover:bg-indigo-500/15 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          Save Workspace Notes
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Parsed Insights / Tags */}
                  <div className="space-y-4.5 bg-card/30 border border-border p-4 rounded-xl">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Match Strategy</span>
                      <p className="text-xs text-slate-300 font-medium font-sans">Heuristics identified key tags in the candidacy index.</p>
                    </div>

                    <div className="space-y-1.5 pt-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Extracted Tech Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedJob.tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-card text-slate-300 border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status update select */}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Outreach State</span>
                      <select
                        value={selectedJob.status}
                        onChange={(e) => handleStatusChange(e.target.value as any)}
                        className="w-full p-2 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Generated">Generated</option>
                        <option value="Sent">Sent</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Declined">Declined</option>
                      </select>
                    </div>

                    {/* Danger zone delete */}
                    <div className="pt-6 border-t border-border">
                      <button
                        onClick={() => handleDeleteJob(selectedJob.id)}
                        className="w-full flex items-center justify-center space-x-2 py-2 border border-rose-500/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Scan File</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <DrawerFooter>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-5 py-2.5 bg-card border border-border hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Drawer Panel
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

    </div>
  );
}
