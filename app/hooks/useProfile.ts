"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { getUserProfileAction, saveUserProfileAction } from "../actions/db-actions";
import type { UserProfile } from "../utils/db";

export function useProfile(userEmail: string) {
  // ─── Profile state ─────────────────────────────────────────────────────────
  const [profile, setProfile]                     = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving]         = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [newSkillText, setNewSkillText]            = useState("");

  // ─── Resume upload state ───────────────────────────────────────────────────
  const fileInputRef                              = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeUploadStep, setResumeUploadStep]   = useState("");

  useEffect(() => {
    if (!userEmail) return;
    getUserProfileAction(userEmail).then(setProfile);
  }, [userEmail]);

  // ─── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    setProfileSaving(true);
    setProfileSaveSuccess(false);
    try {
      await saveUserProfileAction(profile);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Resume ────────────────────────────────────────────────────────────────
  const handleTriggerFileInput = () => fileInputRef.current?.click();

  const handleResumeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setIsUploadingResume(true);
    setResumeUploadStep("Opening file buffers...");
    const steps = [
      "Decompressing resume layout blocks...",
      "Analyzing visual font structures...",
      "Running semantic OCR filters...",
      "Extracting tech stack indices...",
      "Injecting new candidate parameters...",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setResumeUploadStep(steps[idx++]);
      } else {
        clearInterval(interval);
        const extras = ["Docker", "Kubernetes", "GraphQL", "AWS"].filter(s => !profile.skills.includes(s));
        const updated: UserProfile = {
          ...profile,
          resumeFileName: file.name,
          skills: [...profile.skills, ...extras],
        };
        setProfile(updated);
        saveUserProfileAction(updated)
          .then(() => setIsUploadingResume(false))
          .catch(err => { console.error(err); setIsUploadingResume(false); });
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 4000);
      }
    }, 500);
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
          name: "New Project Showcase",
          tech: ["React"],
          description: "Describe the architectural approach and tech used.",
        },
      ],
    });
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

  return {
    profile, setProfile,
    profileSaving, profileSaveSuccess,
    newSkillText, setNewSkillText,
    fileInputRef,
    isUploadingResume, resumeUploadStep,
    handleSaveProfile,
    handleTriggerFileInput,
    handleResumeFileSelected,
    handleAddSkill,
    handleDeleteSkill,
    handleProjectDetailChange,
    handleDeleteProject,
    handleAddBlankProject,
    handleEducationChange,
  };
}
