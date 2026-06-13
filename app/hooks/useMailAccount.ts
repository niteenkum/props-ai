"use client";

// ─── useMailAccount Hook ───────────────────────────────────────────────────
// Manages the full lifecycle of a user's linked mail accounts (Zoho + Gmail).
// Handles: connection status per provider, unified inbox fetching, sending, and disconnecting.

import { useState, useEffect, useCallback } from "react";
import {
  getMailAccountsAction,
  disconnectMailAction,
  fetchInboxAction,
  fetchGmailInboxAction,
  fetchUnifiedInboxAction,
  sendMailAction,
  type MailAccountInfo,
  type MailMessage,
  type SendResult,
} from "../actions/mail-actions";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UseMailAccountReturn {
  // State
  mailAccount:       MailAccountInfo | null;  // legacy — first linked account (compat)
  mailAccounts:      MailAccountInfo[];        // all linked accounts
  isZohoConnected:   boolean;
  isGmailConnected:  boolean;
  isLoading:         boolean;
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
  connect:           () => void;          // legacy — connects Zoho
  connectZoho:       () => void;
  connectGmail:      () => void;
  disconnect:        (provider?: "zoho" | "gmail") => Promise<void>;
  fetchInbox:        () => Promise<void>;
  sendEmail:         (to: string, subject: string, body: string) => Promise<SendResult>;
  clearSendStatus:   () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useMailAccount(userEmail: string | null): UseMailAccountReturn {
  const [mailAccounts,    setMailAccounts]    = useState<MailAccountInfo[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [inbox,           setInbox]           = useState<MailMessage[]>([]);
  const [isFetchingInbox, setIsFetchingInbox] = useState(false);
  const [inboxError,      setInboxError]      = useState<string | null>(null);
  const [isSending,       setIsSending]       = useState(false);
  const [sendError,       setSendError]       = useState<string | null>(null);
  const [lastSendSuccess, setLastSendSuccess] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isZohoConnected  = mailAccounts.some(a => a.provider === "zoho");
  const isGmailConnected = mailAccounts.some(a => a.provider === "gmail");
  const mailAccount      = mailAccounts[0] ?? null; // legacy compat

  // ── Load account status on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getMailAccountsAction(userEmail)
      .then(setMailAccounts)
      .catch(() => setMailAccounts([]))
      .finally(() => setIsLoading(false));
  }, [userEmail]);

  // ── Handle ?connected=... redirect from OAuth callback ──────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !userEmail) return;

    const params = new URLSearchParams(window.location.search);
    const connectedParam = params.get("connected");

    if (connectedParam === "true" || connectedParam === "gmail" || connectedParam === "zoho") {
      console.log("[useMailAccount] OAuth callback detected. Reloading accounts...");
      getMailAccountsAction(userEmail).then(setMailAccounts);
      // Clean up the URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete("connected");
      window.history.replaceState({}, "", clean.toString());
    }
  }, [userEmail]);

  // ── Connect: Zoho OAuth ──────────────────────────────────────────────────
  const connectZoho = useCallback(() => {
    if (!userEmail) return;
    window.location.href = `/api/mail/zoho/connect?email=${encodeURIComponent(userEmail)}`;
  }, [userEmail]);

  // ── Connect: Gmail OAuth via Corsair ─────────────────────────────────────
  const connectGmail = useCallback(() => {
    if (!userEmail) return;
    window.location.href = `/api/mail/gmail/connect?email=${encodeURIComponent(userEmail)}`;
  }, [userEmail]);

  // Legacy connect = Zoho (backward compat)
  const connect = connectZoho;

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async (provider: "zoho" | "gmail" = "zoho") => {
    if (!userEmail) return;
    setIsDisconnecting(true);
    try {
      const result = await disconnectMailAction(userEmail, provider);
      if (result.success) {
        setMailAccounts(prev => prev.filter(a => a.provider !== provider));
        if (provider === "zoho" || mailAccounts.length <= 1) {
          setInbox([]);
        }
      }
    } finally {
      setIsDisconnecting(false);
    }
  }, [userEmail, mailAccounts]);

  // ── Fetch inbox (unified: Zoho + Gmail) ──────────────────────────────────
  const fetchInbox = useCallback(async () => {
    if (!userEmail) return;
    if (mailAccounts.length === 0) return;

    setIsFetchingInbox(true);
    setInboxError(null);

    try {
      // If both accounts connected: unified fetch
      // If only one: fetch that provider
      let result: { success: boolean; messages?: MailMessage[]; error?: string };

      if (isZohoConnected && isGmailConnected) {
        result = await fetchUnifiedInboxAction(userEmail, 100);
      } else if (isGmailConnected) {
        result = await fetchGmailInboxAction(userEmail, 50);
      } else {
        result = await fetchInboxAction(userEmail, 50);
      }

      if (result.success && result.messages) {
        setInbox(result.messages);
      } else {
        setInboxError(result.error ?? "Failed to fetch inbox.");
      }
    } catch (err: any) {
      setInboxError(err?.message ?? "Unexpected error.");
    } finally {
      setIsFetchingInbox(false);
    }
  }, [userEmail, mailAccounts, isZohoConnected, isGmailConnected]);

  // ── Auto-fetch inbox when accounts load ──────────────────────────────────
  // Watch the full provider list — not just length — so adding Zoho after Gmail
  // (or vice versa) properly triggers a unified re-fetch.
  const providerKey = mailAccounts.map(a => a.provider).sort().join(",");
  useEffect(() => {
    if (userEmail && mailAccounts.length > 0) {
      fetchInbox();
    } else {
      setInbox([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, providerKey]);

  // ── Send email (via Zoho — default provider for sending) ─────────────────
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

  // ── Clear send status ────────────────────────────────────────────────────
  const clearSendStatus = useCallback(() => {
    setSendError(null);
    setLastSendSuccess(false);
  }, []);

  return {
    mailAccount,
    mailAccounts,
    isZohoConnected,
    isGmailConnected,
    isLoading,
    inbox,
    isFetchingInbox,
    inboxError,
    isSending,
    sendError,
    lastSendSuccess,
    isDisconnecting,
    connect,
    connectZoho,
    connectGmail,
    disconnect,
    fetchInbox,
    sendEmail,
    clearSendStatus,
  };
}
