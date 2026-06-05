"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { getUserProfileAction, saveUserProfileAction } from "../actions/db-actions";
import { parseResumeWithAIAction } from "../actions/resume-actions";
import type { UserProfile } from "../utils/db";

export function useProfile(userEmail: string) {
  // ─── Profile state ─────────────────────────────────────────────────────────
  const [profile, setProfile]                       = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile]       = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving]           = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [newSkillText, setNewSkillText]              = useState("");

  // ─── Resume upload / AI parse state ────────────────────────────────────────
  const fileInputRef                                = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume]   = useState(false);
  const [resumeUploadStep, setResumeUploadStep]     = useState("");
  const [resumeParseError, setResumeParseError]     = useState<string | null>(null);
  const [resumeParsedAt, setResumeParsedAt]         = useState<Date | null>(null);

  useEffect(() => {
    if (!userEmail) return;
    getUserProfileAction(userEmail).then((data) => {
      setProfile(data);
      setOriginalProfile(JSON.parse(JSON.stringify(data)));
    });
  }, [userEmail]);

  const hasChanges = profile && originalProfile
    ? JSON.stringify(profile) !== JSON.stringify(originalProfile)
    : false;

  // ─── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    setProfileSaving(true);
    setProfileSaveSuccess(false);
    try {
      await saveUserProfileAction(profile, userEmail);
      setOriginalProfile(JSON.parse(JSON.stringify(profile)));
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Resume: trigger file picker ───────────────────────────────────────────
  const handleTriggerFileInput = () => fileInputRef.current?.click();

  // ─── Resume: file selected → read as base64 → AI parse → merge fields ─────
  const handleResumeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setResumeParseError(null);
    setIsUploadingResume(true);
    setResumeUploadStep("Reading PDF file...");

    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        const dataUrl = ev.target?.result as string;
        // dataUrl is like: "data:application/pdf;base64,JVBERi0x..."
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error("Could not read file as base64.");

        setResumeUploadStep("Sending to Gemini AI...");
        const result = await parseResumeWithAIAction(base64, file.name);

        if (!result.success || !result.profile) {
          setResumeParseError(result.error || "AI parsing failed.");
          // Still store the file name
          const updated: UserProfile = { ...profile, resumeFileName: file.name };
          setProfile(updated);
          await saveUserProfileAction(updated, userEmail);
          setIsUploadingResume(false);
          return;
        }

        setResumeUploadStep("Merging profile fields...");

        // Merge AI result — preserve existing values if AI returned empty
        const ai = result.profile;
        const updated: UserProfile = {
          ...profile,
          name:           ai.name          || profile.name,
          role:           ai.role          || profile.role,
          email:          ai.email         || profile.email,
          portfolioUrl:   ai.portfolioUrl  || profile.portfolioUrl,
          githubUrl:      ai.githubUrl     || profile.githubUrl,
          linkedinUrl:    ai.linkedinUrl   || profile.linkedinUrl,
          // Merge skills: combine existing + AI, deduplicate
          skills:         ai.skills && ai.skills.length > 0
            ? Array.from(new Set([...ai.skills]))
            : profile.skills,
          // Replace education + projects only if AI returned real data
          education:      ai.education && ai.education.length > 0
            ? ai.education
            : profile.education,
          projects:       ai.projects && ai.projects.length > 0
            ? ai.projects
            : profile.projects,
          resumeFileName:   file.name,
          resumeText:       ai.resumeText || profile.resumeText,
          resumePdfBase64:  base64,    // store raw PDF so it can be attached to emails
        };

        setProfile(updated);
        setResumeParsedAt(new Date());

        setResumeUploadStep("Saving to database...");
        await saveUserProfileAction(updated, userEmail);
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 4000);
      } catch (err: any) {
        console.error("[useProfile] Resume parse error:", err);
        setResumeParseError(err?.message || "Unexpected error parsing resume.");
      } finally {
        setIsUploadingResume(false);
        setResumeUploadStep("");
        // Reset file input so same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setResumeParseError("Could not read the selected file.");
      setIsUploadingResume(false);
    };

    reader.readAsDataURL(file);
  };

  // ─── Skills ────────────────────────────────────────────────────────────────
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillText.trim() || !profile) return;
    if (!profile.skills.includes(newSkillText.trim()))
      setProfile({ ...profile, skills: [...profile.skills, newSkillText.trim()] });
    setNewSkillText("");
  };

  const handleDeleteSkill = (skill: string) => {
    if (!profile) return;
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  };

  // ─── Projects ──────────────────────────────────────────────────────────────
  const handleProjectDetailChange = (
    idx: number,
    field: "name" | "description" | "tech",
    value: string,
  ) => {
    if (!profile) return;
    const projects = [...profile.projects];
    projects[idx] =
      field === "tech"
        ? { ...projects[idx], tech: value.split(",").map(t => t.trim()).filter(Boolean) }
        : { ...projects[idx], [field]: value };
    setProfile({ ...profile, projects });
  };

  const handleDeleteProject = (idx: number) => {
    if (!profile) return;
    setProfile({ ...profile, projects: profile.projects.filter((_, i) => i !== idx) });
  };

  const handleAddBlankProject = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: [
        ...profile.projects,
        {
          name: "New Project",
          tech: ["React"],
          description: "Describe the project and its impact.",
          links: [],
        },
      ],
    });
  };

  const handleAddProjectLink = (projectIdx: number, label: string, url: string) => {
    if (!profile) return;
    const projects = [...profile.projects];
    const project = { ...projects[projectIdx] };
    const links = project.links ? [...project.links] : [];
    links.push({ label: label.trim(), url: url.trim() });
    project.links = links;
    projects[projectIdx] = project;
    setProfile({ ...profile, projects });
  };

  const handleDeleteProjectLink = (projectIdx: number, linkIdx: number) => {
    if (!profile) return;
    const projects = [...profile.projects];
    const project = { ...projects[projectIdx] };
    if (project.links) {
      project.links = project.links.filter((_, i) => i !== linkIdx);
      projects[projectIdx] = project;
      setProfile({ ...profile, projects });
    }
  };

  // ─── Education ─────────────────────────────────────────────────────────────
  const handleEducationChange = (
    idx: number,
    field: "degree" | "school" | "year",
    value: string,
  ) => {
    if (!profile) return;
    const education = [...profile.education];
    education[idx] = { ...education[idx], [field]: value };
    setProfile({ ...profile, education });
  };

  const handleAddBlankEducation = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      education: [...profile.education, { degree: "", school: "", year: "" }],
    });
  };

  const handleDeleteEducation = (idx: number) => {
    if (!profile) return;
    setProfile({ ...profile, education: profile.education.filter((_, i) => i !== idx) });
  };

  return {
    profile, setProfile,
    originalProfile, setOriginalProfile,
    hasChanges,
    profileSaving, profileSaveSuccess,
    newSkillText, setNewSkillText,
    fileInputRef,
    isUploadingResume, resumeUploadStep,
    resumeParseError, resumeParsedAt,
    handleSaveProfile,
    handleTriggerFileInput,
    handleResumeFileSelected,
    handleAddSkill,
    handleDeleteSkill,
    handleProjectDetailChange,
    handleDeleteProject,
    handleAddBlankProject,
    handleAddProjectLink,
    handleDeleteProjectLink,
    handleEducationChange,
    handleAddBlankEducation,
    handleDeleteEducation,
  };
}
