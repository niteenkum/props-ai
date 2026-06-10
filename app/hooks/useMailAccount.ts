"use client";

// ─── useMailAccount Hook ───────────────────────────────────────────────────
// Manages the full lifecycle of a user's linked mail account.
// Handles: connection status, inbox fetching, sending, and disconnecting.

import { useState, useEffect, useCallback } from "react";
import {
  getMailAccountAction,
  disconnectMailAction,
  fetchInboxAction,
  sendMailAction,
  type MailAccountInfo,
  type MailMessage,
  type SendResult,
} from "../actions/mail-actions";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UseMailAccountReturn {
  // State
  mailAccount:       MailAccountInfo | null;
  isLoading:         boolean;         // initial load
  // Inbox
  inbox:             MailMessage[];
  isFetchingInbox:   boolean;
  inboxError:        string | null;
  // Send
  isSending:         boolean;
  sendError:         string | null;
  lastSendSuccess:   boolean;
  // Disconnect
  isDisconnecting:   boolean;
  // Actions
  connect:           () => void;
  disconnect:        () => Promise<void>;
  fetchInbox:        () => Promise<void>;
  sendEmail:         (to: string, subject: string, body: string) => Promise<SendResult>;
  clearSendStatus:   () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useMailAccount(userEmail: string | null): UseMailAccountReturn {
  const [mailAccount,     setMailAccount]     = useState<MailAccountInfo | null>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [inbox,           setInbox]           = useState<MailMessage[]>([]);
  const [isFetchingInbox, setIsFetchingInbox] = useState(false);
  const [inboxError,      setInboxError]      = useState<string | null>(null);
  const [isSending,       setIsSending]       = useState(false);
  const [sendError,       setSendError]       = useState<string | null>(null);
  const [lastSendSuccess, setLastSendSuccess] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ── Load account status on mount ─────────────────────────────────────────
  useEffect(() => {
    console.log("[useMailAccount] Hook mounted/updated with userEmail:", userEmail);
    if (!userEmail) {
      console.warn("[useMailAccount] No userEmail provided to hook yet.");
      setIsLoading(false);
      return;
    }

    console.log("[useMailAccount] Fetching mail account info for:", userEmail);
    setIsLoading(true);
    getMailAccountAction(userEmail)
      .then((account) => {
        console.log("[useMailAccount] getMailAccountAction resolved:", account);
        setMailAccount(account);
      })
      .catch((err) => {
        console.error("[useMailAccount] getMailAccountAction error:", err);
        setMailAccount(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userEmail]);

  // ── Handle ?connected=true redirect from callback ─────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !userEmail) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      console.log("[useMailAccount] OAuth callback detected. Reloading mail account...");
      // Re-load account info after OAuth success
      getMailAccountAction(userEmail).then((account) => {
        console.log("[useMailAccount] Reloaded mail account after OAuth:", account);
        setMailAccount(account);
      });
      // Clean up the URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete("connected");
      window.history.replaceState({}, "", clean.toString());
    }
  }, [userEmail]);

  // ── Connect: redirect to OAuth flow ──────────────────────────────────────
  const connect = useCallback(() => {
    if (!userEmail) return;
    const url = `/api/mail/zoho/connect?email=${encodeURIComponent(userEmail)}`;
    console.log("[useMailAccount] Redirecting to connection URL:", url);
    window.location.href = url;
  }, [userEmail]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    if (!userEmail) return;
    console.log("[useMailAccount] Disconnecting mail account for:", userEmail);
    setIsDisconnecting(true);
    try {
      const result = await disconnectMailAction(userEmail);
      console.log("[useMailAccount] Disconnect result:", result);
      if (result.success) {
        setMailAccount(null);
        setInbox([]);
      }
    } finally {
      setIsDisconnecting(false);
    }
  }, [userEmail]);

  // ── Fetch inbox ──────────────────────────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    console.log("[useMailAccount] fetchInbox called", { userEmail, mailAccount });
    if (!userEmail) { console.warn("[useMailAccount] fetchInbox aborted: no userEmail"); return; }
    if (!mailAccount) { console.warn("[useMailAccount] fetchInbox aborted: mailAccount is null"); return; }
    setIsFetchingInbox(true);
    setInboxError(null);
    try {
      console.log("[useMailAccount] Calling fetchInboxAction for", userEmail);
      const result = await fetchInboxAction(userEmail, 20);
      console.log("[useMailAccount] fetchInboxAction result:", result);
      if (result.success && result.messages) {
        setInbox(result.messages);
        console.log(`[useMailAccount] ✅ Inbox loaded: ${result.messages.length} messages`);
      } else {
        setInboxError(result.error ?? "Failed to fetch inbox.");
        console.error("[useMailAccount] ❌ fetchInboxAction error:", result.error);
      }
    } catch (err: any) {
      console.error("[useMailAccount] ❌ fetchInbox exception:", err);
      setInboxError(err?.message ?? "Unexpected error.");
    } finally {
      setIsFetchingInbox(false);
    }
  }, [userEmail, mailAccount]);

  // ── Auto-fetch inbox when mailAccount is loaded ──────────────────────────
  useEffect(() => {
    if (userEmail && mailAccount) {
      console.log("[useMailAccount] Auto-fetching inbox since mailAccount is active...", { userEmail, mailAccount });
      fetchInbox();
    } else {
      console.log("[useMailAccount] Auto-fetch skipped:", { userEmail, mailAccount: !!mailAccount });
    }
  }, [userEmail, mailAccount, fetchInbox]);


  // ── Send email ────────────────────────────────────────────────────────────
  const sendEmail = useCallback(async (
    to: string,
    subject: string,
    body: string
  ): Promise<SendResult> => {
    if (!userEmail) return { success: false, error: "Not authenticated." };
    setIsSending(true);
    setSendError(null);
    setLastSendSuccess(false);
    try {
      const result = await sendMailAction(userEmail, to, subject, body);
      if (result.success) {
        setLastSendSuccess(true);
      } else {
        setSendError(result.error ?? "Send failed.");
      }
      return result;
    } catch (err: any) {
      const msg = err?.message ?? "Unexpected send error.";
      setSendError(msg);
      return { success: false, error: msg };
    } finally {
      setIsSending(false);
    }
  }, [userEmail]);

  // ── Clear send status (call after user dismisses toast) ──────────────────
  const clearSendStatus = useCallback(() => {
    setSendError(null);
    setLastSendSuccess(false);
  }, []);

  return {
    mailAccount,
    isLoading,
    inbox,
    isFetchingInbox,
    inboxError,
    isSending,
    sendError,
    lastSendSuccess,
    isDisconnecting,
    connect,
    disconnect,
    fetchInbox,
    sendEmail,
    clearSendStatus,
  };
}
