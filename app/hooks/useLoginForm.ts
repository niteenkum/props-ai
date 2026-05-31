"use client";

import { useState } from "react";
import { loginAction } from "../actions/auth-actions";
import { useLoginSuccess } from "./useLoginSuccess";

export function useLoginForm() {
  const { handleLoginSuccess } = useLoginSuccess();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim())  { setError("Please enter your email."); return; }
    if (!password)      { setError("Please enter your password."); return; }
    setLoading(true);
    const res = await loginAction({ email, password });
    setLoading(false);
    if (res.success && res.user) {
      handleLoginSuccess(res.user.email, res.user.status, res.user.name);
    } else {
      setError(res.error || "Sign in failed.");
    }
  };

  return {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    loading, error, setError,
    handleSubmit,
  };
}
